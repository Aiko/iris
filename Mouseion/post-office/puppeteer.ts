import path from 'path'
import { fork, ChildProcess } from 'child_process'
import crypto from 'crypto'
import Register from '../managers/register'
import { LumberjackEmployer, Logger } from '../utils/logger'
import PostOffice from './post-office'
import autoBind from 'auto-bind'
import { IMAPConfig } from './types'

type SockPuppeteerWaiterParams = {
  success: boolean,
  payload: any,
  error?: string,
  id: string
}
type TriggerResponse = {
  trigger: string
}
const isTriggerResponse = (x: any):x is TriggerResponse => !!(x.trigger)
type Trigger = ((ev: string) => void) | ((ev: string) => Promise<void>)
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

const PO = PostOffice.prototype || {}
const POConnect = PO.connect
const POClose = PO.close
const POCheckConnect = PO.checkConnect

const POGetFolders = PO.getFolders
const PONewFolder = PO.newFolder
const PODeleteFolder = PO.deleteFolder
const POOpenFolder = PO.openFolder

const POListMessages = PO.listMessages
const POListMessagesWithFlags = PO.listMessagesWithFlags
const POListMessagesWithHeaders = PO.listMessagesWithHeaders
const POListMessagesWithEnvelopes = PO.listMessagesWithEnvelopes
const POListMessagesFull = PO.listMessagesFull

const POSearchMessages = PO.searchMessages
const PODeleteMessages = PO.deleteMessages

const POAddMessage = PO.addMessage

const POCopyMessages = PO.copyMessages
const POMoveMessages = PO.moveMessages
const POFlagMessages = PO.flagMessages

export class PostOfficeProxy {
  readonly Log: Logger
  API: ChildProcess

  private readonly waiters: Record<string, SockPuppeteerWaiter> = {}
  private readonly listeners: Record<string, SockPuppeteerListener> = {}
  private readonly queue: ProcessMessage[] = []
  private trigger: Trigger | null = null
  private exists: boolean = false

  private rotating: boolean = false
  get isRotating() { return this.rotating }

  //? in theory may never terminate
  private getID(): string {
    const id = crypto.randomBytes(6).toString('hex')
    if (this.waiters[id]) return this.getID()
    return id
  }

  spawn() {
    this.API = fork(path.join(__dirname, 'puppet.js'), [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    })
    this.API.stdout?.pipe(process.stdout)
    this.API.stderr?.pipe(process.stdout)

    //? Parses incoming messages then calls the relevant callbacks and notifies listeners
    this.API.on('message', (m: string) => {
      const s = JSON.parse(m) as (SockPuppeteerWaiterParams | TriggerResponse)
      if (isTriggerResponse(s)) {
        if (this.trigger) this.trigger(s.trigger)
        return;
      }
      if (!(s?.id)) return this.Log.error("No ID in received message")
      const cb = this.waiters[s.id]
      if (!cb) return this.Log.error("No waiter set.")
      const listener = this.listeners[s.id]
      if (listener) listener()
      cb(s)
    })
    const _this = this
    this.API.on('exit', (code) => {
      _this.Log.error("Post Office puppet exited with code", code)
      setTimeout(async() => {
        await _this.spawn()
        const config = await _this.Registry.get('IMAP Config') as IMAPConfig
        await _this.network.connect(config)
      }, 2000)
    })
    return this.API
  }

  constructor(private Registry: Register) {
    const Lumberjack = Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Post Office Proxy')
    this.API = this.spawn()
    this.exists = true
    autoBind(this)
  }

  setTrigger(trigger: Trigger) {
    this.trigger = trigger
  }

  private proxy<ParamType extends any[], ReturnPromise extends Promise<any>>(action: string, immediate: boolean=true) {
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
        this.Log.log("Queued command.")
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

  //? Bindings below
  network = {
    connect: this.proxy<Parameters<typeof POConnect>, ReturnType<typeof POConnect>>("network.connect"),
    close: this.proxy<Parameters<typeof POClose>, ReturnType<typeof POClose>>("network.close"),
    checkConnect: this.proxy<Parameters<typeof POCheckConnect>, ReturnType<typeof POCheckConnect>>("network.checkConnect"),
  }

  folders = {
    getFolders: this.proxy<Parameters<typeof POGetFolders>, ReturnType<typeof POGetFolders>>("folders.getFolders"),
    newFolder: this.proxy<Parameters<typeof PONewFolder>, ReturnType<typeof PONewFolder>>("folders.newFolder"),
    deleteFolder: this.proxy<Parameters<typeof PODeleteFolder>, ReturnType<typeof PODeleteFolder>>("folders.deleteFolder"),
    openFolder: this.proxy<Parameters<typeof POOpenFolder>, ReturnType<typeof POOpenFolder>>("folders.openFolder"),
  }

  messages = {
    listMessages: this.proxy<Parameters<typeof POListMessages>, ReturnType<typeof POListMessages>>("messages.listMessages"),
    listMessagesWithFlags: this.proxy<Parameters<typeof POListMessagesWithFlags>, ReturnType<typeof POListMessagesWithFlags>>("messages.listMessagesWithFlags"),
    listMessagesWithHeaders: this.proxy<Parameters<typeof POListMessagesWithHeaders>, ReturnType<typeof POListMessagesWithHeaders>>("messages.listMessagesWithHeaders"),
    listMessagesWithEnvelopes: this.proxy<Parameters<typeof POListMessagesWithEnvelopes>, ReturnType<typeof POListMessagesWithEnvelopes>>("messages.listMessagesWithEnvelopes"),
    listMessagesFull: this.proxy<Parameters<typeof POListMessagesFull>, ReturnType<typeof POListMessagesFull>>("messages.listMessagesFull"),

    searchMessages: this.proxy<Parameters<typeof POSearchMessages>, ReturnType<typeof POSearchMessages>>("messages.searchMessages"),
    deleteMessages: this.proxy<Parameters<typeof PODeleteMessages>, ReturnType<typeof PODeleteMessages>>("messages.deleteMessages"),

    addMessage: this.proxy<Parameters<typeof POAddMessage>, ReturnType<typeof POAddMessage>>("messages.addMessage"),

    copyMessages: this.proxy<Parameters<typeof POCopyMessages>, ReturnType<typeof POCopyMessages>>("messages.copyMessages"),
    moveMessages: this.proxy<Parameters<typeof POMoveMessages>, ReturnType<typeof POMoveMessages>>("messages.moveMessages"),
    flagMessages: this.proxy<Parameters<typeof POFlagMessages>, ReturnType<typeof POFlagMessages>>("messages.flagMessages"),
  }

}