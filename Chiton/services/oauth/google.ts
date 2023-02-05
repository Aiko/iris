import { shell } from "electron"
import request from 'request'
import autoBind from "auto-bind"
import { google } from 'googleapis'
import type { OAuth2Client } from "google-auth-library"
import type { Request } from 'express-serve-static-core'
import SockPuppet from "@Marionette/ws/sockpuppet"
import type { Chiton } from "@Chiton/app"

export default class GOAuth extends SockPuppet {
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

	private readonly client: OAuth2Client
  private callback?: (code: string) => void | any

	constructor(
		private readonly chiton: Chiton,
		private readonly scopes: string[]
	) {
		super("Google OAuth", {
			forest: chiton.forest,
			renderer: false,
		})

		if (!(this.scopes.includes('profile'))) this.scopes.push('profile')
		if (!(this.scopes.includes('email'))) this.scopes.push('email')

		this.client = new google.auth.OAuth2(
			this.chiton.config.secrets.googleClientId, undefined, "http://127.0.0.1:41599/oauth/google"
		)

		this.chiton.comms.get("/oauth/google", this.loopback.bind(this), {
			respondWithClose: true
		})

		autoBind(this)
	}

	private loopback(req: Request) {
		const code = (typeof (req.query.code) === "string") ? req.query.code : "";
		this.chiton.inbox.focus()
		this.callback!(code)
	}

	// TODO: stronger types for authorize and refresh

	private authorize(login_hint?: string): Promise<any> {
		const _this = this
		return new Promise(async (s, _) => {
			_this.client.on('tokens', s)

			const url = _this.client.generateAuthUrl({
				access_type: "offline",
				scope: _this.scopes,
				login_hint,
			})

			_this.callback = async (code: string) => {
				const { tokens } = await _this.client.getToken(code)
				_this.client.setCredentials(tokens)
			}

			shell.openExternal(url)
		})
	}

	private refresh(refresh_token: string): Promise<any> {
		const _this = this
		return new Promise(async (s, _) => {
			const opts = {
        method: 'POST',
        url: 'https://oauth2.googleapis.com/token',
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        form: {
          client_id: _this.chiton.config.secrets.googleClientId,
          client_secret: undefined,
          refresh_token: refresh_token,
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
