import nodemailer from "nodemailer"
type NodeMailerPlugin = (args?: any) => Mail.PluginFunction<any>;
const inlineBase64 = require('nodemailer-plugin-inline-base64') as NodeMailerPlugin
const inlineCss = require('nodemailer-juice') as NodeMailerPlugin
import SecureCommunications from '../utils/comms'
import Register from '../../Mouseion/managers/register'
import { IMAPConfig } from '../../Mouseion/post-office/types'
import Mail from "nodemailer/lib/mailer"
import autoBind from "auto-bind"

export default class CarrierPigeon {
  private comms: SecureCommunications

  constructor(
    Registry: Register
  ) {
    this.comms = Registry.get("Communications") as SecureCommunications

    this.comms.register("please send an email", this.send.bind(this))
    this.comms.register("please test SMTP connection", this.test.bind(this))

    autoBind(this)
  }

  private getTransporter(config: Partial<IMAPConfig>): Mail {
    let transporter: Mail;
    console.log("Sending using:", config)
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
      transporter.sendMail(mail, (error, info) => {
        if (error) console.error("Send error:", error)
        else console.log("Sent email to", mail.to)
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