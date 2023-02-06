import autoBind from 'auto-bind'
import 'colors'
import crypto from 'crypto'
import { shell } from 'electron'
import path from 'path'
import WebSocket, { Server } from 'ws'
import Storage from '@Iris/common/storage'
import fs from 'fs'
import { RESERVED_PORTS } from '@Iris/common/port'
import datapath from '@Iris/common/datapath'

//! Roots requires Electron Shell and should ONLY operate within the main process.

export default class Roots {
	private readonly storage: Storage
	private readonly id: string = crypto.randomBytes(6).toString('hex')
	private constructor(logdir: string="logs-roots") {
		logdir = datapath('Mouseion', logdir)
		this.storage = new Storage(logdir, {json: false})

		//? Setup simple Websockets for logging
		const wss_local = new Server({ port: RESERVED_PORTS.ROOTS.LOCAL })
		const wss_remote = new Server({ port: RESERVED_PORTS.ROOTS.REMOTE })
		const _this = this
		wss_local.on("connection", (ws: WebSocket) => {
			ws.on("message", (m: string) => {
				_this.log(m)
			})
		})
		wss_remote.on("connection", (ws: WebSocket) => {
			ws.on("message", (m: string) => {
				try {
					_this.log(m, true)
				} catch (e) {
					console.log(e)
				}
			})
			setInterval(() => ws.send("ping"), 1000)
		})

		console.log(`Roots initialized in ${this.storage.dir}/${this.id}`.green.bgBlack)
		autoBind(this)
	}

	log(msg: string, from_remote: boolean=false) {
    if (from_remote) console.log(msg.replace("\n", " ").red.bgGreen)
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

	private static me?: Roots

	/** Do NOT call this outside the Main process. */
	static init(logdir?: string) {
		if (this.me) return this.me
		this.me = new Roots(logdir)
		return this.me
	}
}