import WebSocket from 'ws'
import net from 'net'
import Forest from './logger'
import { LumberjackEmployer, Logger } from './logger'
import autoBind from 'auto-bind'
const forest: Forest = new Forest('logs-marionette')
const Lumberjack: LumberjackEmployer = forest.Lumberjack
const Log: Logger = Lumberjack('Marionette')

const DEFAULT_PORT = 41605

export const unused_port = async (start_port=DEFAULT_PORT): Promise<number> => {
  const look_for_port = (port: number): Promise<number> => new Promise((s, _) => {
    const serv = net.createServer()
    serv.listen(port, () => {
      Log.success("Port", port, "is open.")
      serv.once('close', () => s(port))
    })
    serv.close()
    serv.on('error', _ => {
      Log.warn("Port", port, "did not allow binding. Continuing search.")
      //? We add 10 here because one Mailbox spawns multiple subprocesses for email, DB, etc
      look_for_port(port + 10).then(p => s(p))
    })
  })

  return await look_for_port(start_port)
}

//? If you want to type this be my guest, I don't have the patience for this
const stratify = (obj: any, prefix = ''): any =>
    Object.keys(obj).reduce((res: Record<string, any>, el: string) => {

      //? if it's an array, skip it
      if (Array.isArray(obj[el])) return res

      if (typeof obj[el] === 'object' && obj[el] !== null )
        return {...res, ...stratify(obj[el], prefix + el + '.')}

      const key = prefix + el
      const tmp: Record<string, any> = {}
      tmp[key] = obj[el]
      return {...res, ...tmp}
    }, [])
;;

export default class SockPuppet {
  readonly API: any
  readonly port: number
  readonly wss: WebSocket.Server
  readonly sockets: WebSocket[] = []

  private constructor(Target: any, port: number) {
    this.API = stratify(Target)
    Log.success("Stratified target into API", this.API)
    this.port = port
    this.wss = new WebSocket.Server({ port })
    Log.success("API bound to port", port)

    this.wss.on('connection', (ws: WebSocket) => {
      const sksucc = (id: string) => (payload: object) => ws.send(JSON.stringify({
        success: true,
        payload, id
      }))
      const skerr = (id: string) => (msg: string) => ws.send(JSON.stringify({
        error: msg + '\n' + (new Error),
        id
      }))

      this.sockets.push(ws)

      ws.on('message', async (m: string) => {
        /*
        * m should be 'please ' + JSON stringified message
        * object should have the following structure:
        * {
        *   id: String, // some random string to make ws easier
        *   action: String,
        *   args: [...] // must ALWAYS be set. for no args just do []
        * }
        */

        try {
          // TODO: eventually some security or so here beyond `please`...
          const {
            id,
            action,
            args
          }: {
            id: string,
            action: string,
            args: any[]
          } = JSON.parse(m.substr('please '.length))

          if (!id) return Log.error("No ID provided.")
          if (!action) return Log.error("No action provided.")

          const success = sksucc(id)
          const error = skerr(id)

          const attempt = async (method: (...xs: any) => Promise<any> | any) => {
            try {
              const result = await method(...args)
              return success(result)
            } catch (e) {
              Log.error(e, new Error())
              return error(e)
            }
          }

          const method = this.API[action]
          if (!method) return("Action provided does not match any existing binding.")

          return await attempt(method)
        } catch (e) {
          return ws.send(JSON.stringify({
            error: e + '\n' + (new Error())
          }))
        }

      })

    })
    autoBind(this)
  }

  /**
   * Target should be something with method bindings,
   * i.e. an object where leaf-node property values are methods.
   * Please also note that Target **MUST be immutable!**
  */
  static async build(Target: any) {
    const port = await unused_port()
    return new this(Target, port)
  }

  trigger(event: any) {
    this.sockets.map(ws => ws.send(JSON.stringify({ event, })))
  }

}