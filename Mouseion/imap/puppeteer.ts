import path from 'path'
import { fork, ChildProcess } from 'child_process'
import crypto from 'crypto'
import Register from '../register'
import { LumberjackEmployer, Logger } from '../utils/logger'
import PostOffice from './post-office'

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

type PromisingMethod<ParamType extends any[], Return> = (...args: ParamType) => Promise<Return>
type MethodProxy = <ParamType extends any[], ReturnPromise extends Promise<any>>
  (action: string, immediate?: boolean) => PromisingMethod<ParamType, ValueType<ReturnPromise>>;;

export class PostOfficeProxy {
  readonly Log: Logger
  readonly API: ChildProcess

  private readonly waiters: Record<string, SockPuppeteerWaiter> = {}
  private readonly listeners: Record<string, SockPuppeteerListener> = {}
  private readonly queue: ProcessMessage[] = []

  private rotating: boolean = false
  get isRotating() { return this.rotating }

  //? in theory may never terminate
  private getID(): string {
    const id = crypto.randomBytes(6).toString('hex')
    if (this.waiters[id]) return this.getID()
    return id
  }

  constructor(Registry: Register) {
    const Lumberjack = Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Post Office Proxy')
    this.API = fork(path.join(__dirname, 'puppet.js'), [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    })
    this.API.stdout?.pipe(process.stdout)
    this.API.stderr?.pipe(process.stdout)

    //? Parses incoming messages then calls the relevant callbacks and notifies listeners
    this.API.on('message', (m: string) => {
      const s = JSON.parse(m) as SockPuppeteerWaiterParams
      if (!(s?.id)) return this.Log.error("No ID in received message")
      const cb = this.waiters[s.id]
      if (!cb) return this.Log.error("No waiter set.")
      const listener = this.listeners[s.id]
      if (listener) listener()
      cb(s)
    })
  }

  proxy<ParamType extends any[], ReturnPromise extends Promise<any>>(action: string, immediate: boolean=true) {
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
          this.Log.error(id, '|', error || 'Failed without error.')
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

  async rotate() {
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

  //? Bindings below
  network = {
    connect: this.proxy('network.connect'),
    close: this.proxy('network.close'),
  }

  hello() {
    const x = async (y: number, z: boolean) => {
      return true
    }
    this.proxy<Parameters<typeof x>, ReturnType<typeof x>>("hello")
  }


}
/*
const PostOfficeProxy2 = Lumberjack => {

  return {
    network: {
      connect: proxy_it('network.connect'),
      close: proxy_it('network.close'),
      checkConnect: proxy_it('network.checkConnect'),
    },
    folders: {
      getFolders: proxy_it('folders.getFolders'),
      newFolder: proxy_it('folders.newFolder'),
      deleteFolder: proxy_it('folders.deleteFolder'),
      openFolder: proxy_it('folders.openFolder'),
    },
    messages: {
      listMessages: proxy_it('messages.listMessages', qu=false),
      searchMessages: proxy_it('messages.searchMessages'),
      deleteMessages: proxy_it('messages.deleteMessages'),
      addMessage: proxy_it('messages.addMessage'),
      copyMessages: proxy_it('messages.copyMessages'),
      moveMessages: proxy_it('messages.moveMessages'),
      flagMessages: proxy_it('messages.flagMessages')
    }
  }
}

*/