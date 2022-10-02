import { shell } from "electron"
import request from 'request'
import type Register from "@Mouseion/managers/register"
import type SecureCommunications from "@Chiton/utils/comms"
import autoBind from "auto-bind"
import { google } from 'googleapis'
import type { OAuth2Client } from "google-auth-library"
import type { Request } from 'express-serve-static-core'
import type WindowManager from "@Chiton/utils/window-manager"
import type { Logger, LumberjackEmployer } from "@Mouseion/utils/logger"

export default class GOauth {

  private readonly comms: SecureCommunications
  private readonly Log: Logger
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
    const Lumberjack = Registry.get("Lumberjack") as LumberjackEmployer
    this.Log = Lumberjack("Mailman")
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
    else return this.Log.error("OAuth code was not caught by listener.")
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