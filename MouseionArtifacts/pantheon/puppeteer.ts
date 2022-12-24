import path from 'path'
import { fork, ChildProcess } from 'child_process'
import crypto from 'crypto'
import type Register from '@Mouseion/managers/register'
import type { LumberjackEmployer, Logger } from '@Mouseion/utils/logger'
import * as Pantheon from './pantheon'
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

type PromisingMethod<ParamType extends any[], Return> = (...args: ParamType) => Promise<Return>
type MethodProxy = <ParamType extends any[], ReturnPromise extends Promise<any>>
  (action: string, immediate?: boolean) => PromisingMethod<ParamType, ValueType<ReturnPromise>>;;

export type Cursor = {
  cursor: number
}

const Cache = Pantheon.Cache.prototype || {}
const CacheEnvelopeCache = Cache?.envelope?.cache
const CacheEnvelopeCheck = Cache?.envelope?.check
const CacheHeadersCache = Cache?.headers?.cache
const CacheHeadersCheck = Cache?.headers?.check
const CacheContentCache = Cache?.content?.cache
const CacheContentCheck = Cache?.content?.check
const CacheFullCache = Cache?.full?.cache
const CacheFullCheck = Cache?.full?.check

const DB = Pantheon?.DB?.prototype || {}
const DBGetCursor = DB?.getCursor
const DBNextCursor = DB?.nextCursor
const DBPrevCursor = DB?.prevCursor
const DBMessagesFindMID = DB?.findMessageWithMID
const DBMessagesFindUID = DB?.findMessageWithUID
const DBMessagesFindFolder = DB?.findMessagesInFolder
const DBMessagesFindSubject = DB?.findMessagesWithSubject
const DBMessagesAdd = DB?.addMessage
const DBMessagesUpdate = DB?.updateMessage
const DBMessagesPurgeAll = DB?.removeMessage
const DBMessagesPurgeLocation = DB?.removeMessageLocation
const DBMessagesAuditLog = DB?.messageAuditLog
const DBThreadsFindTID = DB?.findThreadWithTID
const DBThreadsFindLatest = DB?.findThreadsByLatest
const DBThreadsFindFolder = DB?.findThreadsInFolder
const DBThreadsMerge = DB?.mergeThreads
const DBThreadsMessages = DB?.threadMessages
const DBThreadsAuditLog = DB?.threadAuditLog
const DBContactsSearch = DB?.findContacts
const DBContactsUpdateReceived = DB?.updateContactReceived
const DBContactsUpdateSent = DB?.updateContactSent
const DBAttachmentsSearch = DB?.findAttachments

export class PantheonProxy {
  readonly Log: Logger
  readonly API: ChildProcess
  private readonly user: string

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
    this.Log = Lumberjack('Pantheon Puppeteer')
    this.API = fork(path.join(__dirname, 'puppet.js'), [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    })
    this.API.stdout?.pipe(process.stdout)
    this.API.stderr?.pipe(process.stderr)

    const config = Registry.get('IMAP Config') as IMAPConfig
    this.user = config.user

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

    autoBind(this)
  }

  async init(dir: string, cursor: number): Promise<Cursor> {
    return await this.proxy<[string, number, string], Promise<Cursor>>('init')(dir, cursor, this.user)
  }

  private proxy<ParamType extends any[], ReturnPromise extends Promise<any | void>>(action: string, immediate: boolean=true) {
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

  cursor = {
    get: this.proxy<Parameters<typeof DBGetCursor>, Promise<Cursor>>('cursor.get'),
    next: this.proxy<Parameters<typeof DBNextCursor>, Promise<Cursor>>('cursor.next'),
    prev: this.proxy<Parameters<typeof DBPrevCursor>, Promise<Cursor>>('cursor.prev')
  }

  cache = {
    envelope: {
      cache: this.proxy<Parameters<typeof CacheEnvelopeCache>, ReturnType<typeof CacheEnvelopeCache>>("cache.envelope.cache"),
      check: this.proxy<Parameters<typeof CacheEnvelopeCheck>, ReturnType<typeof CacheEnvelopeCheck>>("cache.envelope.check"),
    },
    headers: {
      cache: this.proxy<Parameters<typeof CacheHeadersCache>, ReturnType<typeof CacheHeadersCache>>("cache.headers.cache"),
      check: this.proxy<Parameters<typeof CacheHeadersCheck>, ReturnType<typeof CacheHeadersCheck>>("cache.headers.check"),
    },
    content: {
      cache: this.proxy<Parameters<typeof CacheContentCache>, ReturnType<typeof CacheContentCache>>("cache.content.cache"),
      check: this.proxy<Parameters<typeof CacheContentCheck>, ReturnType<typeof CacheContentCheck>>("cache.content.check"),
    },
    full: {
      cache: this.proxy<Parameters<typeof CacheFullCache>, ReturnType<typeof CacheFullCache>>("cache.full.cache"),
      check: this.proxy<Parameters<typeof CacheFullCheck>, ReturnType<typeof CacheFullCheck>>("cache.full.check"),
    },
  }

  db = {
    messages: {
      find: {
        mid: this.proxy<Parameters<typeof DBMessagesFindMID>, ReturnType<typeof DBMessagesFindMID>>("db.messages.find.mid"),
        uid: this.proxy<Parameters<typeof DBMessagesFindUID>, ReturnType<typeof DBMessagesFindUID>>("db.messages.find.uid"),
        folder: this.proxy<Parameters<typeof DBMessagesFindFolder>, ReturnType<typeof DBMessagesFindFolder>>("db.messages.find.folder"),
        subject: this.proxy<Parameters<typeof DBMessagesFindSubject>, ReturnType<typeof DBMessagesFindSubject>>("db.messages.find.subject"),
      },
      add: this.proxy<Parameters<typeof DBMessagesAdd>, ReturnType<typeof DBMessagesAdd>>("db.messages.add"),
      update: this.proxy<Parameters<typeof DBMessagesUpdate>, ReturnType<typeof DBMessagesUpdate>>("db.messages.update"),
      purge: {
        all: this.proxy<Parameters<typeof DBMessagesPurgeAll>, ReturnType<typeof DBMessagesPurgeAll>>("db.messages.purge.all"),
        location: this.proxy<Parameters<typeof DBMessagesPurgeLocation>, ReturnType<typeof DBMessagesPurgeLocation>>("db.messages.purge.location"),
      },
      audit_log: this.proxy<Parameters<typeof DBMessagesAuditLog>, ReturnType<typeof DBMessagesAuditLog>>("db.messages.audit_log"),
    },
    threads: {
      find: {
        tid: this.proxy<Parameters<typeof DBThreadsFindTID>, ReturnType<typeof DBThreadsFindTID>>("db.threads.find.tid"),
        latest: this.proxy<Parameters<typeof DBThreadsFindLatest>, ReturnType<typeof DBThreadsFindLatest>>("db.threads.find.latest"),
        folder: this.proxy<Parameters<typeof DBThreadsFindFolder>, ReturnType<typeof DBThreadsFindFolder>>("db.threads.find.folder"),
      },
      merge: this.proxy<Parameters<typeof DBThreadsMerge>, ReturnType<typeof DBThreadsMerge>>("db.threads.merge"),
      messages: this.proxy<Parameters<typeof DBThreadsMessages>, ReturnType<typeof DBThreadsMessages>>("db.threads.messages"),
      audit_log: this.proxy<Parameters<typeof DBThreadsAuditLog>, ReturnType<typeof DBThreadsAuditLog>>("db.threads.audit_log"),
    },
    contacts: {
      search: this.proxy<Parameters<typeof DBContactsSearch>, ReturnType<typeof DBContactsSearch>>("db.contacts.search"),
      update: {
        received: this.proxy<Parameters<typeof DBContactsUpdateReceived>, ReturnType<typeof DBContactsUpdateReceived>>("db.contacts.update.received"),
        sent: this.proxy<Parameters<typeof DBContactsUpdateSent>, ReturnType<typeof DBContactsUpdateSent>>("db.contacts.update.sent"),
      }
    },
    attachments: {
      search: this.proxy<Parameters<typeof DBAttachmentsSearch>, ReturnType<typeof DBAttachmentsSearch>>("db.attachments.search"),
    }
  }

}