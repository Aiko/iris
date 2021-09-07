import { remote, BrowserWindow } from "electron"
import URL from 'url'
import request from 'request'
import Register from "../../Mouseion/managers/register"
import SecureCommunications from "../utils/comms"
import autoBind from "auto-bind"
const BW = process.type === 'renderer' ? remote.BrowserWindow : BrowserWindow
import { google } from 'googleapis'
import { OAuth2Client } from "google-auth-library"

export default class GOauth {

  private readonly comms: SecureCommunications
  private readonly client: OAuth2Client

  constructor(
    Registry: Register,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private scopes: string[]
  ) {
    this.comms = Registry.get("Inbox Communications") as SecureCommunications

    if (!scopes.includes("profile")) scopes.push("profile")
    if (!scopes.includes("email")) scopes.push("email")

    this.comms.register("please get google oauth token", this.newToken)
    this.comms.register("please refresh google oauth token", this.refreshToken)

    this.client = new google.auth.OAuth2(
      clientId, clientSecret, "urn:ietf:wg:oauth:2.0:oob"
    )

    autoBind(this)
  }

  private newToken({login_hint}: {login_hint?: string}) {
    const _this = this
    return new Promise(async (s, _) => {
      const win = new BW({
        useContentSize: true,
        fullscreen: false
      })

      _this.client.on("tokens", tokens => {
        s(tokens)
        win.removeAllListeners("close")
        win.close()
      })

      const url = _this.client.generateAuthUrl({
        access_type: "offline",
        scope: _this.scopes,
        login_hint,
      })
      win.loadURL(url, {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4101.0 Safari/537.36 Edg/83.0.474.0"
      })

      win.on("closed", () => {
        return s({ error: 'User closed the Google login window' })
      })

      win.webContents.on("did-navigate", (_, newURL) => {
        const parsed = URL.parse(newURL, true)
        if (parsed.query.error) {
          s({ error: parsed.query.error_description })
          win.removeAllListeners('close')
          win.close()
        }

        const auth_code = parsed.query.code || parsed.query.approvalCode
        if (auth_code) finish(auth_code)
      })

      win.on("page-title-updated", () => {
        const title = win.getTitle()
        if (title.startsWith("Denied")) {
          s({ error: `The request was denied with title: "${title}"` })
          win.removeAllListeners('close')
          win.close()
        } else if (title.startsWith("Success")) {
          const auth_code = title.split(/[ =]/)[2]
          finish(auth_code)
        }
      })

      const finish = code => _this.client.getToken(code).then(res => _this.client.setCredentials(res.tokens))
    })
  }

  private refreshToken({r_token}: {r_token: string}) {
    const _this = this
    return new Promise(async (s, _) => {
      const opts = {
        method: 'POST',
        url: 'https://oauth2.googleapis.com/token',
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        form: {
          client_id: _this.clientId,
          client_secret: _this.clientSecret,
          refresh_token: r_token,
          grant_type: 'refresh_token'
        }
      }

      request(opts, (e, _, b) => {
        if (e) return s({ error: e })
        const d = JSON.parse(b)
        s(d)
      })
    })
  }

}