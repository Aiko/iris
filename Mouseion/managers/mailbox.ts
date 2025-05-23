import type { IMAPConfig } from "@Mouseion/post-office/types";
import Register from "@Mouseion/managers/register";
import Forest from "@Mouseion/utils/logger"
import type { LumberjackEmployer, Logger } from "@Mouseion/utils/logger"
import Storage from "@Mouseion/utils/storage";
import path from "path"
import { PostOfficeProxy } from "@Mouseion/post-office/puppeteer";
import { PantheonProxy } from "@Mouseion/pantheon/puppeteer";
import type { Cursor } from "@Mouseion/pantheon/puppeteer";
import Folders from "@Mouseion/managers/folders";
import Custodian from "@Mouseion/managers/cleaners";
import ContactsQueue from "@Mouseion/queues/contacts";
import Tailor from "@Mouseion/actors/tailor";
import Operator from "@Mouseion/actors/operator";
import BoardRulesQueue from "@Mouseion/queues/board-rules";
import type { BoardRule } from "@Mouseion/queues/board-rules";
import Resolver from "@Mouseion/actors/resolver";
import Sync from "@Mouseion/actors/sync";
import Lock from "@Mouseion/utils/promise-lock";
import autoBind from 'auto-bind'

type Trigger = ((ev: string) => void) | ((ev: string) => Promise<void>)

export default class Mailbox {

  readonly courier: PostOfficeProxy
  readonly triggers: Trigger[] = []
  readonly sync: Sync
  readonly contactsQ: ContactsQueue
  readonly boardrulesQ: BoardRulesQueue
  readonly tailor: Tailor
  private readonly seamstress: Tailor
  readonly pantheon: PantheonProxy
  readonly folders: Folders
  private readonly lock: Lock
  readonly resolver: Resolver
  readonly link: Operator
  private readonly cypher: Operator
  queuedSync: NodeJS.Timeout | null = null

  constructor(
    public readonly Registry: Register,
    private readonly Log: Logger,
    private readonly SYNC_INTERVAL: number=30*1000,
  ) {
    this.courier = Registry.get("Courier") as PostOfficeProxy
    this.sync = Registry.get("Sync") as Sync
    this.contactsQ = Registry.get("Contacts Queue") as ContactsQueue
    this.boardrulesQ = Registry.get("Board Rules Queue") as BoardRulesQueue
    this.tailor = Registry.get("Tailor") as Tailor
    this.seamstress = Registry.get("Seamstress") as Tailor
    this.pantheon = Registry.get("Pantheon") as PantheonProxy
    this.folders = Registry.get("Folders") as Folders
    this.resolver = Registry.get("Resolver") as Resolver //? not to be confused with the absolver
    this.cypher = Registry.get("Cypher") as Operator
    this.link = Registry.get("Link") as Operator
    this.lock = new Lock()
    autoBind(this)
  }

  static async load(config: IMAPConfig, AI_BATCH_SIZE=500, THREAD_BATCH_SIZE=100): Promise<Mailbox | null> {
    //? Lumberjack
    const forest: Forest = new Forest('logs')
    const Lumberjack: LumberjackEmployer = forest.Lumberjack
    const Log = Lumberjack("Mailbox")

    //? Registry
    const Registry: Register = new Register()
    Registry.register("ENABLE_AUDITING", false)
    Registry.register("Lumberjack", Lumberjack)
    Registry.register("Registry", Registry)
    Log.success("Instantiated Registry")

    //? IMAP Config
    let dir: string = config.user.replace(/[^A-z\.0-9]/gim, '')
    switch (process.platform) {
      case 'darwin': dir = path.join(process.env.HOME || "~", "Library", "Application Support", "Aiko Mail", "Mouseion", dir); break
      case 'win32': dir = path.join(process.env.APPDATA || "/c/", "Aiko Mail", "Mouseion", dir); break
      case 'linux': dir = path.join(process.env.HOME || "~", ".Aiko Mail", "Mouseion", dir); break
    }
    Registry.register('dir', dir)
    Registry.register('IMAP Config', config)
    Log.success("Living in", dir)


    //* NOTE: Metadata, not Metahuman
    const meta: Storage = new Storage(path.join(dir, '/meta'), { json: true })
    Registry.register("Metadata Storage", meta)
    Log.success("Instantiated Metadata Storage")

    //? Post Office Proxy
    const courier: PostOfficeProxy = new PostOfficeProxy(Registry)
    Registry.register("Courier", courier)
    Log.success("Instantiated Courier")
    const connected = await courier.network.connect(config).catch(Log.error)
    if (!connected) {
      Log.error("Either credentials incorrect or packet delivery failure.")
      return null;
    } else Log.success("Established connection to mailserver.")

    //? Pantheon Proxy
    const pantheon: PantheonProxy = new PantheonProxy(Registry)
    Registry.register("Pantheon", pantheon)
    Log.success("Instantiated Pantheon")
    let cursor: Cursor = await meta.load("cursor") || {
      cursor: 0
    }
    cursor = await pantheon.init(dir, cursor.cursor)
    Registry.register('cursor', cursor)
    Log.success("Pantheon initialized successfully, cursor is at", cursor.cursor)

    //? Folders
    const folders: Folders = new Folders(Registry)
    Registry.register("Folders", folders)
    Log.success("Instantiated Folders")
    await folders.sync()
    Log.success("Synced folders.")

    //? Custodian
    const custodian: Custodian = new Custodian(Registry)
    Registry.register("Custodian", custodian)
    Log.success("Instantiated Custodian")

    //? Contacts
    const contactsQ: ContactsQueue = new ContactsQueue(Registry)
    Registry.register("Contacts Queue", contactsQ)
    Log.success("Instantiated Contacts Queue")

    //? Seamstress
    const seamstress: Tailor = new Tailor(Registry, {
      internal_use: true
    })
    Registry.register("Seamstress", seamstress)
    Log.success("Instantiated Seamstress")

    //? Cypher
    const cypher: Operator = new Operator(Registry, {
      auto_increment_cursor: false
    })
    Registry.register("Cypher", cypher)
    Log.success("Instantiated Cypher")

    //? Board Rules
    const boardrulesQ: BoardRulesQueue = new BoardRulesQueue(Registry)
    Registry.register("Board Rules Queue", boardrulesQ)
    Log.success("Instantiated Board Rules Queue")

    //? Resolver
    const resolver: Resolver = new Resolver(Registry, AI_BATCH_SIZE)
    Registry.register("Resolver", resolver)
    Log.success("Instantiated Resolver")

    //? Tailor
    const tailor: Tailor = new Tailor(Registry, {
      internal_use: false
    })
    Registry.register("Tailor", tailor)
    Log.success("Instantiated Tailor")

    //? Link
    const link: Operator = new Operator(Registry, {
      auto_increment_cursor: true,
      internal_use: false
    })
    Registry.register("Link", link)
    Log.success("Instantiated Link")

    //? Sync
    const sync: Sync = new Sync(Registry, AI_BATCH_SIZE, THREAD_BATCH_SIZE)
    Registry.register("Sync", sync)
    Log.success("Instantiated Sync")
    sync.queueForSync(folders.inbox())
    sync.queueForSync(folders.sent())
    sync.queueForSync(folders.drafts())
    sync.queueForSync(folders.spam())
    sync.queueForSync(folders.archive())
    sync.queueForSync(folders.trash())
    sync.queueForSync(...folders.boardPaths())

    const mailbox = new this(Registry, Log)
    Registry.register("Mailbox", mailbox)
    Log.success("Instantiated Mailbox")
    courier.setTrigger(mailbox.trigger)

    return mailbox
  }

  updateConfig(config: Partial<IMAPConfig>) {
    this.Registry.register("IMAP Config", config)
  }

  trigger(event: string) {

    this.Log.shout("Event triggered:", event)

    switch (event) {
      case "imap-exists":
        this.run()
        break;

      case "courier-reconnect":


      default: this.triggers.map(trigger => trigger(event))
    }
  }

  register(trigger: Trigger) {
    this.triggers.push(trigger)
  }

  async run() {
    const _this = this
    this.Log.log("Triggered mailbox run-through...")
    this.lock.acquire(async () => {
      this.Log.log("Acquired lock for run-through...")
      if (_this.queuedSync) {
        clearTimeout(_this.queuedSync)
        _this.queuedSync = null
      }

      try {
        const imapStatus = await _this.courier.network.checkConnect()
        this.Log.log("IMAP connection healthy?:", imapStatus)
        if (!imapStatus) {
          this.Log.warn("IMAP connection is unhealthy, ending mailbox run early.")
          _this.trigger("courier-disconnected")
          _this.queuedSync = setTimeout(_this.run, _this.SYNC_INTERVAL)
          return;
        }
        _this.trigger("sync-started")

        const syncStatus = await _this.sync.syncAll()
        if (!syncStatus) {
          this.Log.warn("Bulk sync failed, ending mailbox run early.")
          this.Log.warn("Due to mailbox run early stopping, some items may be left in the queue.")
          this.Log.warn("Please note if the app is closed in this state, those items will evaporate.")
          _this.queuedSync = setTimeout(_this.run, _this.SYNC_INTERVAL)
          return;
        }

        await _this.contactsQ.consume()
        await _this.seamstress.phase_2()
        await _this.tailor.phase_2()
        await _this.boardrulesQ.consume()
        await _this.tailor.phase_3()
        await _this.courier.folders.openFolder(_this.folders.inbox() || "INBOX")
        _this.Log.success("Sync completed.")
        _this.trigger("sync-finished")
      } catch(e) {
        _this.Log.error("Mailbox sync error:", e)
      }

      _this.queuedSync = setTimeout(_this.run, _this.SYNC_INTERVAL)
      _this.Log.success("Releasing lock.")
    })
  }

  async close() {
    this.Log.log("Closing out engine.")
    await this.courier.network.close()
    await this.courier.API.kill()
    await this.pantheon.API.kill()
    this.Registry.clear()
    this.Log.success("Mailbox has been totally closed.")
    this.Log.warn("Please close out the Mouseion process. Mouseion is in a BAD state.")
  }

}