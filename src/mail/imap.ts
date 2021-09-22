import autoBind from 'auto-bind'
import { EightySix } from '../../Mouseion/client'
import Register from '../../Mouseion/managers/register'
import { IMAPConfig } from '../../Mouseion/post-office/types'
import SecureCommunications from '../utils/comms'
const EmailJS = require('emailjs-imap-client')
const Client = EmailJS.default

/**
*? To start working with a new mailbox, first use this IPC call below to create a wrapper
*? Then bind your SockPuppeteer to the port that is returned
*? Then use SockPuppeteer as you would the normal engine API object, it will proxy req's to SockPuppet
*/

export default class Mailman {

  private readonly comms: SecureCommunications

  private engines: Record<string, EightySix> = {}
  private engineConfigs: Record<string, Partial<IMAPConfig>> = {}

  constructor(Registry: Register) {
    this.comms = Registry.get("Communications") as SecureCommunications

    this.comms.register("please update engine config", this.updateConfig.bind(this))
    this.comms.register("please get or start the corresponding engine", this.getEngine.bind(this))
    this.comms.register("please test a connection", this.testConnection.bind(this))

    autoBind(this)
  }

  private updateConfig({config}: {config: Partial<IMAPConfig>}) {
    const email = config.user ?? ""

    const agent = this.engines[email]
    if (!agent) return { error: "Agent has never been initialized for that email." }
    agent.proxy("reconnect")(config)
    this.engineConfigs[email] = config

    return agent.port
  }

  private async getEngine({config, force}: {config: IMAPConfig, force?: boolean}) {
    const email = config.user

    if (force) {
      const agent = this.engines[email]
      if (agent) {
        try {
          await agent.proxy("close")()
          console.log("Agent 86 has been disposed of.")
        } catch (_) { }
        delete this.engines[email]
      }
    }

    if (this.engines[email]) {
      console.log("Agent 86 is already in the field.")
      return this.engines[email].port
    }

    const agent = await EightySix.init(config)
    this.engines[email] = agent
    this.engineConfigs[email] = config
    console.log("Agent 86 has been dispatched.")
    return agent.port
  }

  private async testConnection(config: Partial<IMAPConfig>) {
    const options = {
      logLevel: EmailJS.LOG_LEVEL_ERROR,
      auth: (config.oauth || config.xoauth2) ? {
        user: config.user, xoauth2: config.oauth || config.xoauth2
      } : {
        user: config.user, pass: config.pass
      },
      id: {
        version: "1.0b",
        name: "Aiko Mail"
      },
      useSecureTransport: config.secure,
      enableCompression: false
    }

    const testClient = new Client(config.host, config.port, options)
    await testClient.connect()
    await testClient.listMailboxes()
    await testClient.close()

    return { valid: true }
  }

}