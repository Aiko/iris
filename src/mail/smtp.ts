import nodemailer from "nodemailer"
type NodeMailerPlugin = (args?: any) => Mail.PluginFunction<any>;
const inlineBase64 = require('nodemailer-plugin-inline-base64') as NodeMailerPlugin
const inlineCss = require('nodemailer-juice') as NodeMailerPlugin
import SecureCommunications from '../utils/comms'
import Register from '../../Mouseion/managers/register'
import { IMAPConfig } from '../../Mouseion/post-office/types'
import Mail from "nodemailer/lib/mailer"
import autoBind from "auto-bind"
import { Logger, LumberjackEmployer } from "../../Mouseion/utils/logger";

export default class CarrierPigeon {
  private readonly comms: SecureCommunications
  private readonly Log: Logger

  constructor(
    Registry: Register
  ) {
    this.comms = Registry.get("Communications") as SecureCommunications
    const Lumberjack = Registry.get("Lumberjack") as LumberjackEmployer
    this.Log = Lumberjack("Mailman")

    this.comms.register("please send an email", this.send.bind(this))
    this.comms.register("please test SMTP connection", this.test.bind(this))

    autoBind(this)
  }

  private getTransporter(config: Partial<IMAPConfig>): Mail {
    let transporter: Mail;
    this.Log.log("Sending using:", config)
    switch(config.provider) {

      case "google": transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: config.user,
          accessToken: config.oauth
        }
      }); break;

      case "outlook": transporter = nodemailer.createTransport({
        service: 'hotmail',
        auth: {
          type: 'OAuth2',
          user: config.user,
          accessToken: config.oauth
        }
      }); break;

      case "microsoft": transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        auth: {
          type: 'OAuth2',
          user: config.user,
          accessToken: config.oauth
        }, tls: {
          ciphers : 'SSLv3',
        }
      })

      default: transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.pass ? {
          user: config.user,
          pass: config.pass
        } : {
          user: config.user,
          type: 'OAuth2',
          accessToken: config.oauth
        }
      })

    }

    transporter.use("compile", inlineBase64())
    transporter.use("compile", inlineCss({ inlinePseudoElements: true }))

    return transporter
  }

  private async send({mail, config}: {mail: any, config: Partial<IMAPConfig>}) {
    const transporter = this.getTransporter(config)
    return await new Promise((s, _) => {
      this.Log.log("Sending email to", mail.to)
      transporter.sendMail(mail, (error, info) => {
        if (error) this.Log.error("Send error:", error)
        else this.Log.log("Sent email to", mail.to)
        ;;error ? s({ error,  }) : s(info);;
      })
    })
  }

  private async test(config: Partial<IMAPConfig>) {
    const transporter = this.getTransporter(config)
    return await new Promise((s, _) => {
      transporter.verify((error, success) => error ? s({ error,  }) : s({ valid: success }))
    })
  }

}