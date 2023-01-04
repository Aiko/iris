import { BrowserWindow, shell } from "electron"
import request from 'request'
import autoBind from "auto-bind"
import SockPuppet from "@Marionette/ws/sockpuppet"
import type { Chiton } from "@Chiton/app"
import URL from "url"

export default class MSOAuth extends SockPuppet {
	puppetry = {
		authorize: this.authorize,
		refresh: this.refresh
	}

	protected checkInitialize(): boolean {
		return true
	}
	protected async initialize(args: any[], success: (payload: object) => void) {
		return success({})
	}

	constructor(
		private readonly chiton: Chiton,
	) {
		super("Microsoft OAuth", {
			forest: chiton.forest,
			renderer: false,
		})

		autoBind(this)
	}

	// TODO: stronger typing for authorize
	private authorize(login_hint?: string) {
		const _this = this
		return new Promise(async (s, _) => {

			const params = [
        `client_id=${this.chiton.config.secrets.microsoftClientId}`,
        "response_type=code",
        "redirect_uri=https%3A%2F%2Flogin.microsoftonline.com%2Fcommon%2Foauth2%2Fnativeclient",
        "response_mode=query",
        "scope=offline_access%20User.Read%20https%3A%2F%2Foutlook.office.com%2FUser.Read%20https%3A%2F%2Foutlook.office.com%2FIMAP.AccessAsUser.All%20https%3A%2F%2Foutlook.office.com%2FSMTP.Send",
        "state=aikomail"
      ]
      if (login_hint) params.push(`login_hint=${login_hint}`)
      const url = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" + params.join('&')

      const win = new BrowserWindow({
        useContentSize: true,
        fullscreen: false
      })
      win.loadURL(url)

			//? you can't get both the profile and outlook tokens in one call because the M in Microsoft stands for monke
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
              client_id: _this.chiton.config.secrets.microsoftClientId,
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
              client_id: _this.chiton.config.secrets.microsoftClientId,
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

	private refresh(refresh_tokens: {
		email: string,
		profile: string
	}): Promise<any> {
		const _this = this
		return new Promise(async (s, _) => {
			const opts = {
        method: 'POST',
        url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        form: {
          client_id: _this.chiton.config.secrets.microsoftClientId,
          scope: 'offline_access https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send',
          refresh_token: refresh_tokens.email,
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
            client_id: _this.chiton.config.secrets.microsoftClientId,
            scope: 'user.read',
            refresh_token: refresh_tokens.profile,
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