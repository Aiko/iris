import autoBind from 'auto-bind'
import { EightySix } from '@Iris/Mouseion2/client'
import type Register from '@Mouseion/managers/register'
import type { IMAPConfig } from '@Mouseion/post-office/types'
import type { Logger, LumberjackEmployer } from '@Mouseion/utils/logger'
import type SecureCommunications from '@Chiton/utils/comms'
import { shell, dialog, app } from 'electron'
import fs from 'fs'
import path from 'path'
const EmailJS = require('emailjs-imap-client')
const Client = EmailJS.default

/**
*? To start working with a new mailbox, first use this IPC call below to create a wrapper
*? Then bind your SockPuppeteer to the port that is returned
*? Then use SockPuppeteer as you would the normal engine API object, it will proxy req's to SockPuppet
*/

export default class Mailman {

  private readonly comms: SecureCommunications
  private readonly Log: Logger

  private engines: Record<string, EightySix> = {}
  private engineConfigs: Record<string, Partial<IMAPConfig>> = {}

  constructor(Registry: Register) {
    this.comms = Registry.get("Communications") as SecureCommunications
    const Lumberjack = Registry.get("Lumberjack") as LumberjackEmployer
    this.Log = Lumberjack("Mailman")

    this.comms.register("please update engine config", this.updateConfig.bind(this))
    this.comms.register("please get or start the corresponding engine", this.getEngine.bind(this))
    this.comms.register("please test a connection", this.testConnection.bind(this))
    this.comms.register("please preview an attachment", this.previewAttachment.bind(this))
    this.comms.register("please download an attachment", this.downloadAttachment.bind(this))
    this.comms.register("please burn the mouseion", this.killMouseion.bind(this))
    this.comms.register("please open mouseion", this.openMouseion.bind(this))

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
      this.Log.log("Slaying Agent 86.")
      if (agent) {
        try {
          agent.proxy("close", true)()
        } catch (_) { }
        delete this.engines[email]
        this.Log.log("Agent 86 has been disposed of.")
      }
    }

    if (!force && this.engines[email]) {
      this.Log.log("Agent 86 is already in the field.")
      return this.engines[email].port
    }

    this.Log.log("Deploying Agent 86...")
    const agent = await EightySix.init(config)
    this.engines[email] = agent
    this.engineConfigs[email] = config
    this.Log.success("Agent 86 has been dispatched.")
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

  private async openMouseion() {
    const MDir = (() => {
      switch (process.platform) {
        case 'darwin': return path.join(process.env.HOME || "~", "Library", "Application Support", "Aiko Mail", "Mouseion"); break
        case 'win32': return path.join(process.env.APPDATA || "/c/", "Aiko Mail", "Mouseion"); break
        case 'linux': return path.join(process.env.HOME || "~", ".Aiko Mail", "Mouseion"); break
        default: return path.join(process.env.HOME || "~", ".Aiko Mail", "Mouseion"); break
      }
    })()
    await shell.openPath(MDir)
  }

  private async previewAttachment({storagePath, filepath}: {storagePath: string, filepath: string}) {
    const dir = storagePath ? storagePath + "/" : ""
    const fp = filepath
    try {
      const e = await shell.openPath(`${dir}${fp}`)
      if (e) {
        this.Log.error(`Couldn't open ${fp} due to error:`, e)
        return false
      }
      return true
    } catch (e) {
      this.Log.error(`Couldn't open ${fp} due to error:`, e)
      return false
    }
  }

  private async downloadAttachment({storagePath, filepath}: {storagePath: string, filepath: string}) {
    const dir = storagePath
    const fp = filepath
    try {

      const downloadFolder = (() => {
        switch(process.platform) {
          case "win32": return `${process.env.USERPROFILE}\\Downloads`
          case "darwin": return `${process.env.HOME}/Downloads`
          default: return `${process.env.HOME}/Downloads`
        }
      })()

      const filename = fp.split("/").pop()

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Save Attachment",
        defaultPath: `${downloadFolder}/${filename}`,
        filters: [ //? copilot wrote this so... I hope it works? lol
          { name: "All Files", extensions: ["*"] },
          { name: "PDF", extensions: ["pdf"] },
          { name: "Word", extensions: ["doc", "docx"] },
          { name: "Excel", extensions: ["xls", "xlsx"] },
          { name: "PowerPoint", extensions: ["ppt", "pptx"] },
          { name: "Text", extensions: ["txt"] },
          { name: "Image", extensions: ["jpg", "jpeg", "png", "gif"] },
          { name: "Audio", extensions: ["mp3", "wav", "aac"] },
          { name: "Video", extensions: ["mp4", "avi", "mkv"] }
        ]
      })

      if (canceled || !filePath) {
        this.Log.warn("User cancelled attachment download/no filePath returned.")
        return false
      }

      this.Log.shout("Saving file to", filePath)
      await fs.promises.copyFile(`${dir}/${fp}`, filePath)
      this.Log.log("Copied:", fp, "->", filePath)
      return true
    } catch (e) {
      this.Log.error(`Couldn't download ${fp} due to error:`, e)
      return false
    }
  }

  private async killMouseion() {
    this.Log.shout("KILLING MOUSEION.")
    try {
      const agents = Object.keys(this.engines)
      agents.map(agent => {
        try {
          this.engines[agent].proxy("close")()
          this.Log.log("Agent 86 has been disposed of.")
        } catch(_) { }
        delete this.engines[agent]
      })

      const MDir = (() => {
        switch (process.platform) {
          case 'darwin': return path.join(process.env.HOME || "~", "Library", "Application Support", "Aiko Mail", "Mouseion"); break
          case 'win32': return path.join(process.env.APPDATA || "/c/", "Aiko Mail", "Mouseion"); break
          case 'linux': return path.join(process.env.HOME || "~", ".Aiko Mail", "Mouseion"); break
          default: return path.join(process.env.HOME || "~", ".Aiko Mail", "Mouseion"); break
        }
      })()

      this.Log.log("Deleting Mouseion directory...")

      //? delete MDir
      await fs.promises.rmdir(MDir, { recursive: true })
      this.Log.log("Goodbye.")

      app.relaunch()
      app.quit()
      } catch (e) {
      this.Log.error("Couldn't kill Mouseion:", e)
    }
  }

}