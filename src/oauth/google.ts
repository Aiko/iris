import { remote, BrowserWindow, shell, app } from "electron"
import URL from 'url'
import request from 'request'
import Register from "../../Mouseion/managers/register"
import SecureCommunications from "../utils/comms"
import autoBind from "auto-bind"
const BW = process.type === 'renderer' ? remote.BrowserWindow : BrowserWindow
import { google } from 'googleapis'
import { OAuth2Client } from "google-auth-library"
import { Request } from 'express-serve-static-core'
import WindowManager from "../utils/window-manager"

export default class GOauth {

  private readonly comms: SecureCommunications
  private readonly client: OAuth2Client
  private readonly windowManager: WindowManager
  private tmpListener: ((code: string) => void | any) | null = null

  constructor(
    private readonly Registry: Register,
    private readonly clientId: string,
    private readonly clientSecret: string | undefined,
    private scopes: string[]
  ) {
    this.comms = Registry.get("Communications") as SecureCommunications
    this.windowManager = Registry.get("Window Manager") as WindowManager

    if (!scopes.includes("profile")) scopes.push("profile")
    if (!scopes.includes("email")) scopes.push("email")

    this.comms.register("please get google oauth token", this.newToken.bind(this))
    this.comms.register("please refresh google oauth token", this.refreshToken.bind(this))
    this.comms.registerGET("/oauth/google", this.getCode.bind(this))

    this.client = new google.auth.OAuth2(
      clientId, clientSecret, "http://127.0.0.1:41599/oauth/google"
    )

    autoBind(this)
  }

  private getCode(req: Request) {
    const codeParam = req.query.code
    const code: string = codeParam ? (typeof codeParam == "string" ? codeParam : "") : ""
    this.windowManager.focus()
    if (this.tmpListener) return this.tmpListener(code)
    else return console.error("OAuth code was not caught by listener.")
  }


  private newToken({login_hint}: {login_hint?: string}) {
    const _this = this
    return new Promise(async (s, _) => {
      const finish = (code: string) => _this.client.getToken(code).then(res => _this.client.setCredentials(res.tokens))

      _this.client.on("tokens", tokens => {
        s(tokens)
      })

      const url = _this.client.generateAuthUrl({
        access_type: "offline",
        scope: _this.scopes,
        login_hint,
      })


      this.tmpListener = finish

      shell.openExternal(url)

      //! Below doesn't work currently as Google has removed Electron as a trusted browser
      /*
      const win = new BW({
        useContentSize: true,
        fullscreen: false
      })

      _this.client.on("tokens", tokens => {
        s(tokens)
        win.removeAllListeners("close")
        win.close()
      })

      win.loadURL(url, {
        userAgent: this.Registry.get("user agent") as string
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

        const auth_code = <string> (parsed.query.code || parsed.query.approvalCode)
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
      */
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