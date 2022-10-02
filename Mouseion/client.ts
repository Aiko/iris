import path from 'path'
import { fork, ChildProcess } from 'child_process'
import crypto from 'crypto'
import autoBind from 'auto-bind'
import type { IMAPConfig } from '@Mouseion/post-office/types'

type SockPuppeteerWaiterParams = {
  success: boolean,
  payload: any,
  error?: string,
  id: string
}
type SockPuppeteerWaiter = (_: SockPuppeteerWaiterParams) => void
type SockPuppeteerListener = () => void

type ValueType<T> =
  T extends Promise<infer U>
    ? U
    : T;;

type ProcessMessage = {id: string, msg: string}

type PortInfo = { wsport: number }
const isPortInfo = (x: any):x is PortInfo => !!(x.wsport)

export class EightySix {

  private readonly waiters: Record<string, SockPuppeteerWaiter> = {}
  private readonly listeners: Record<string, SockPuppeteerListener> = {}
  private readonly queue: ProcessMessage[] = []

  private rotating: boolean = false
  get isRotating() { return this.rotating }

  public port: number | null = null

  //? in theory may never terminate
  private getID(): string {
    const id = crypto.randomBytes(6).toString('hex')
    if (this.waiters[id]) return this.getID()
    return id
  }

  private constructor(
    public readonly API: ChildProcess,
    portWaiter: (p: number) => any
  ) {
    //? Parses incoming messages then calls the relevant callbacks and notifies listeners
    this.API.on('message', (m: string) => {
      const s = JSON.parse(m) as (SockPuppeteerWaiterParams | PortInfo)
      if (isPortInfo(s)) {
        if (!(this.port)) {
          this.port = s.wsport
          console.log("EightySix connected on".magenta, this.port)
          portWaiter(s.wsport)
        }
        return
      }
      if (!(s?.id)) return console.error("No ID in received message")
      const cb = this.waiters[s.id]
      if (!cb) return console.error("No waiter set.")
      const listener = this.listeners[s.id]
      if (listener) listener()
      cb(s)
    })
    autoBind(this)
  }

  static async init(config: IMAPConfig): Promise<EightySix> {
    let agent: EightySix;
    return new Promise(async (scb, _) => {
      const API = fork(path.join(__dirname, 'server.js'), [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
      })
      API.stdout?.pipe(process.stdout)
      API.stderr?.pipe(process.stdout)

      const cb = (p: number) => {
        scb(agent)
      }

      agent = new this(API, cb)
      await agent.proxy('init')(config)
      return agent
    })
  }


  public proxy<ParamType extends any[], ReturnPromise extends Promise<any>>(action: string, immediate: boolean=true) {
    type Return = ValueType<ReturnPromise>
    return (...args: ParamType): Promise<Return> => new Promise((s, _) => {
      const id = this.getID()
      const instr = { id, action, args }

      const cb: SockPuppeteerWaiter = ({ success, payload, error }: {
        success: boolean,
        payload: Return,
        error?: string
      }) => {
        if (error || !success) {
          console.error(id, '|', error || 'Failed without error.')
          _()
        }
        else s(payload)
        delete this.waiters[id]
      }

      this.waiters[id] = cb

      if (!immediate) {
        this.queue.push({
          id, msg: 'please ' + JSON.stringify(instr)
        })
        if (!this.rotating) this.rotate()
      } else {
        this.API.send('please ' + JSON.stringify(instr))
      }

    })
  }

  private async rotate() {
    if (this.queue.length > 0) {
      this.rotating = true
      const { id, msg } = this.queue.shift() as ProcessMessage //? TS didn't connx length > 0 to shift() != undefined
      this.listeners[id] = () => {
        delete this.listeners[id]
        this.rotate()
      }
      this.API.send(msg)
    } else {
      this.rotating = false
    }
  }

}