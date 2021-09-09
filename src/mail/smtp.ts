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

    this.comms.register("please send an email", this.send)
    this.comms.register("please test SMTP connection", this.test)

    autoBind(this)
  }

  private getTransporter(config: Partial<IMAPConfig>): Mail {
    let transporter: Mail;
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
        service: "hotmail",
        auth: {
          user: config.user,
          pass: config.pass
        }
      })

      default: transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass
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
      transporter.sendMail(mail, (error, info) => error ? s({ error,  }) : s(info))
    })
  }

  private async test(config: Partial<IMAPConfig>) {
    const transporter = this.getTransporter(config)
    return await new Promise((s, _) => {
      transporter.verify((error, success) => error ? s({ error,  }) : s({ valid: success }))
    })
  }

}