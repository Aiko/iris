import { remote, BrowserWindow } from "electron"
import URL from 'url'
import request from 'request'
import Register from "../../Mouseion/managers/register"
import SecureCommunications from "../utils/comms"
import autoBind from "auto-bind"
const BW = process.type === 'renderer' ? remote.BrowserWindow : BrowserWindow

export default class MSOauth {

  private readonly comms: SecureCommunications

  constructor(
    Registry: Register,
    private readonly clientId: string,
    private readonly tenant: string
  ) {
    this.comms = Registry.get("Communications") as SecureCommunications

    this.comms.register("please get microsoft oauth token", this.newToken)
    this.comms.register("please refresh microsoft oauth token", this.refreshToken)

    autoBind(this)
  }

  private newToken({login_hint}: {login_hint?: string}) {
    const _this = this
    return new Promise(async (s, _) => {


      const params = [
        `client_id=${this.clientId}`,
        "response_type=code",
        "redirect_uri=https%3A%2F%2Flogin.microsoftonline.com%2Fcommon%2Foauth2%2Fnativeclient",
        "response_mode=query",
        "scope=offline_access%20User.Read%20https%3A%2F%2Foutlook.office.com%2FUser.Read%20https%3A%2F%2Foutlook.office.com%2FIMAP.AccessAsUser.All%20https%3A%2F%2Foutlook.office.com%2FSMTP.Send",
        "state=aikomail"
      ]
      if (login_hint) params.push(`login_hint=${login_hint}`)
      const url = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" + params.join('&')

      const win = new BW({
        useContentSize: true,
        fullscreen: false
      })
      win.loadURL(url)

      //! you can improve this later, the weird two-code setup is because the basic user profile token is separate
      //! this is intentional in MS APIs because the M in Microsoft stands for monke
      //! so we just get two codes by reloading the URL
      let emailCode: string;
      const finish = (code: string | string[]) => {
        if (!emailCode) {
          const opts = {
            method: 'POST',
            url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            headers: {
              'content-type': 'application/x-www-form-urlencoded'
            },
            form: {
              client_id: _this.clientId,
              scope: 'offline_access https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send',
              code: code,
              redirect_uri: 'https://login.microsoftonline.com/common/oauth2/nativeclient',
              grant_type: 'authorization_code'
            }
          }

          request(opts, (e, _, b) => {
            if (e) return s({ error: e })
            const d = JSON.parse(b)
            emailCode = d
            win.loadURL(url)
          })
        }
        else {
          const opts2 = {
            method: 'POST',
            url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            headers: {
              'content-type': 'application/x-www-form-urlencoded'
            },
            form: {
              client_id: _this.clientId,
              scope: 'user.read',
              code: code,
              redirect_uri: 'https://login.microsoftonline.com/common/oauth2/nativeclient',
              grant_type: 'authorization_code'
            }
          }
          request(opts2, (e, _, b2) => {
            if (e) return s({ error: e })
            const d2 = JSON.parse(b2)
            s({
              profile: d2,
              email: emailCode
            })
            win.removeAllListeners('close')
            win.close()
          })
        }
      }

      win.on("closed", () => s({ error: "User closed the Microsoft login window." }))

      win.webContents.on("did-navigate", (_, newURL) => {
        const parsed = URL.parse(newURL, true)
        if (parsed.query.error) {
          s({ error: parsed.query.error_description })
          win.removeAllListeners("close")
          win.close()
          return;
        }

        const auth_code = parsed.query.code || parsed.query.approvalCode
        if (auth_code) finish(auth_code)
      })

      win.webContents.on("page-title-updated", () => {
        const title = win.getTitle()
        if (title.startsWith("Denied")) {
          s({ error: `The request was denied with title: "${title}"` })
          win.removeAllListeners("close")
          win.close()
          return;
        }

        if (title.startsWith("Success")) {
          const auth_code = title.split(/[ =]/)[2]
          if (auth_code) finish(auth_code)
        }
      })

    })
  }

  private refreshToken({r_token_email, r_token_profile}: {r_token_email: string, r_token_profile: string}) {
    const _this = this
    return new Promise(async (s, _) => {
      const opts = {
        method: 'POST',
        url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        form: {
          client_id: _this.clientId,
          scope: 'offline_access https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send',
          refresh_token: r_token_email,
          grant_type: 'refresh_token'
        }
      }

      request(opts, (e, _, b) => {
        if (e) return s({ error: e })
        const d = JSON.parse(b)
        const opts2 = {
          method: 'POST',
          url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          headers: {
            'content-type': 'application/x-www-form-urlencoded'
          },
          form: {
            client_id: _this.clientId,
            scope: 'user.read',
            refresh_token: r_token_profile,
            grant_type: 'refresh_token'
          }
        }

        request(opts2, (e, _, b2) => {
          if (e) return s({ error: e })
          const d2 = JSON.parse(b2)
          s({
            profile: d2,
            email: d
          })
        })
      })
    })
  }

}