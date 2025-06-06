import autoBind from 'auto-bind'
import 'colors'
import crypto from 'crypto'
import { shell } from 'electron'
import path from 'path'
import WebSocket, { Server } from 'ws'
import Storage from '@Mouseion/utils/storage'
import fs from 'fs'
import type Register from '@Mouseion/managers/register'
import type SecureCommunications from '@Chiton/utils/comms'

//! this is the only Mouseion utility that lives outside of Mouseion
//! THIS IS ON PURPOSE.
//! Roots requires Electron Shell to work and can ONLY operate within the main process

//! NOTHING ELSE SHOULD LIVE ON PORT 4158 OR 4159
//! THIS IS ALSO WHY ALL OTHER PORTS IN AIKO MAIL ARE 5 DIGIT NUMBERS!
const DEFAULT_PORT = 4159
const CLIENT_PORT = 4158

export default class Roots {
  private readonly comms: SecureCommunications
  private readonly storage: Storage
  private readonly dir: string
  private readonly id: string
  private readonly wss: Server
  private readonly wss2: Server

  constructor(dir: string="logs-roots", Registry: Register) {
    this.comms = Registry.get("Communications") as SecureCommunications
    this.comms.register("please get the logs", this.getLogs.bind(this))

    //? initialize dir to the correct app datapath
    const platform: string = process.platform
    switch (platform) {
      case 'darwin': dir = path.join(
        process.env.HOME as string, 'Library', 'Application Support',
        'Aiko Mail', 'Mouseion', dir
      ); break;
      case 'win32': dir = path.join(
        process.env.APPDATA as string,
        'Aiko Mail', 'Mouseion', dir
      ); break;
      case 'linux': dir = path.join(
        process.env.HOME as string,
        '.Aiko Mail', 'Mouseion', dir
      ); break;
    }
    this.dir = dir
    this.storage = new Storage(this.dir, {json: false})
    this.id = crypto.randomBytes(6).toString('hex')
    this.wss = new Server({ port: DEFAULT_PORT })
    this.wss2 = new Server({ port: CLIENT_PORT })
    const _this = this
    this.wss.on("connection", (ws: WebSocket) => {
      ws.on("message", (m: string) => {
        _this.log(m)
      })
    })
    this.wss2.on("connection", (ws: WebSocket) => {
      ws.on("message", (m: string) => {
        try {
          this.log(m)
        } catch (e) {
          console.log(e)
        }
      })
      setInterval(() => ws.send("ping"), 1000)
    })

    console.log(`Roots initialized in ${this.storage.dir}/${this.id}`.green.bgBlack)
    autoBind(this)
  }

  log(msg: string) {
    if (msg.includes("[C]")) console.log(msg.replace("\n", "").black.bgGreen)
    this.storage.append(this.id, msg)
    if (msg.includes("[ ERROR ]")) {
      throw new Error(msg.split("[ ERROR ]")[1])
    }
  }

  async getLogs() {
    const downloadFolder = (() => {
      switch(process.platform) {
        case "win32": return `${process.env.USERPROFILE}\\Downloads`
        case "darwin": return `${process.env.HOME}/Downloads`
        default: return `${process.env.HOME}/Downloads`
      }
    })()
    const log_dest = `${downloadFolder}/aiko-mail-${this.id}.log`
    await fs.promises.copyFile(`${this.storage.dir}/${this.id}.log`, log_dest)
    await shell.showItemInFolder(path.normalize(log_dest))
  }

}