import { ipcMain } from 'electron'
import WebSocket, { Server } from 'ws'
import { createServer } from 'net'
import { sign, verify } from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { unused_port } from '../../Mouseion/utils/marionette'
import autoBind from 'auto-bind'

const DEFAULT_PORT = 41604

//! Create a new comms object for each service, as it
//! will only support a singular websocket connection (the latest is used)
export default class SecureCommunications {
  private readonly key: string
  readonly port: number
  private readonly wss: Server
  private readonly waiters: Record<string, () => void> = {}
  private readonly connections: WebSocket[] = []

  private constructor(port: number) {
    this.port = port

    this.key = randomBytes(32).toString('hex')
    console.log("New Secure Communications object created.")
    ipcMain.handle("key exchange", async (_, q): Promise<string> => {
      const { secret } = q as { secret: string }
      const token = sign({ token: secret }, this.key, { expiresIn: 60 * 60 * 24 * 7 })
      const payload = sign({ token, }, secret, { expiresIn: 60 * 60 * 24 * 7 })
      return payload
    })
    ipcMain.handle("status", async (): Promise<{success: true}> => {
      return { success: true }
    })
    ipcMain.handle("get websocket port", () => this.port)

    this.wss = new Server({ port, })
    const _this = this
    this.wss.on("connection", (ws: WebSocket) => {
      this.connections.push(ws)
      ws.on("message", (m: string) => {
        const { stream } = JSON.parse(m) as { stream: string }
        if (_this.waiters[stream]) _this.waiters[stream]()
      })
    })

    autoBind(this)
  }

  tag = (): string => randomBytes(32).toString('hex')

  private _send(tag: string, data: any): Promise<void> {
    if (!(this.port || this.wss)) throw 'WebSocket server has not yet been started for IPC stream!'
    return new Promise((s, _) => {
      this.waiters[tag] = s
      this.connections.reduceRight(_ => _).send(JSON.stringify({ tag, data }))
    })
  }

  //? Returns the payload you should send back through normal IPC
  async send(data: any): Promise<{stream: string}> {
    const tag = this.tag()
    await this._send(tag, data)
    return {stream: tag}
  }

  static async init(): Promise<SecureCommunications> {
    const port = await unused_port(DEFAULT_PORT)
    const comms = new SecureCommunications(port)
    return comms
  }

  private verify(tok: string): string {
    if (!tok) throw "Missing token"
    //! FIXME: this is likely an error as the defined return type of verify is string
    const { token } = verify(tok, this.key) as { token: string }
    return token
  }

  private sign(secret: string, payload: any): string {
    return sign(payload, secret, { expiresIn: 60 * 60 * 24 * 7 })
  }

  register(channel: string, cb: any) {
    const _this = this
    ipcMain.handle(channel, async (_, q) => {
      const { token } = q

      let client_secret: string;
      try { client_secret = _this.verify(token) } catch (e) {
        console.error(e)
        return { error: e }
      }
      if (!client_secret) return { error: "Couldn't decode client secret." }

      try {
        const payload = await cb(q)
        if (payload?.error) return payload
        return {
          s: _this.sign(client_secret, {
            success: true,
            payload,
          })
        }
      } catch (e) {
        return { error: e }
      }

    })
  }

  static registerBasic(channel: string, cb: any) {
    ipcMain.handle(channel, async (_, q) => {
      try {
        const payload = await cb(q)
        if (payload?.error) return payload
        return { success: true, payload }
      } catch (e) {
        return { error: e }
      }
    })
  }
}

ipcMain.handle("start new websocket server", async (_, q) => {
  console.error("NEW SECURE COMMS???? WHY???")
  const comms = await SecureCommunications.init()
  return comms.port
})