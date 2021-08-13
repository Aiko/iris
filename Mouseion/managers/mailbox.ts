import { IMAPConfig } from "../post-office/types";
import Register from "./register";
import Forest from "../utils/logger"
import { LumberjackEmployer, Logger } from "../utils/logger"
import Storage from "../utils/storage";
import path from "path"
import { PostOfficeProxy } from "../post-office/puppeteer";
import { Cursor, PantheonProxy } from "../pantheon/puppeteer";
import Folders from "./folders";
import Custodian from "./cleaners";
import ContactsQueue from "../queues/contacts";
import Tailor from "../actors/tailor";
import Operator from "../actors/operator";
import BoardRulesQueue from "../queues/board-rules";
import Resolver from "../actors/resolver";
import Sync from "../actors/sync";

export default class Mailbox {

  private Log: Logger

  constructor(Registry: Register) {
    const Lumberjack: LumberjackEmployer = Registry.get("Lumberjack") as LumberjackEmployer
    this.Log = Lumberjack("Mailbox")
  }

  static async build(config: IMAPConfig, AI_BATCH_SIZE=500, THREAD_BATCH_SIZE=100) {

    //? Registry
    const Registry: Register = new Register()

    //? IMAP Config
    let dir: string = config.user.replace(/[^A-z\.0-9]/gim, '')
    switch (process.platform) {
      case 'darwin': dir = path.join(process.env.HOME || "~", "Library", "Application Support", "Aiko Mail", "Mouseion", dir); break
      case 'win32': dir = path.join(process.env.APPDATA || "/c/", "Aiko Mail", "Mouseion", dir); break
      case 'linux': dir = path.join(process.env.HOME || "~", ".Aiko Mail", "Mouseion", dir); break
    }
    Registry.register('IMAP Config', config)

    //? Lumberjack
    const forest: Forest = new Forest('logs')
    const Lumberjack: LumberjackEmployer = forest.Lumberjack
    Registry.register("Lumberjack", Lumberjack)

    //? Metadata Storage
    const meta: Storage = new Storage(dir, { json: true })
    Registry.register("Metadata Storage", meta)

    //? Post Office Proxy
    const courier: PostOfficeProxy = new PostOfficeProxy(Registry)
    await courier.network.connect(config) // TODO: error on connect failure
    Registry.register("Courier", courier)

    //? Pantheon Proxy
    const pantheon: PantheonProxy = new PantheonProxy(Registry)
    Registry.register("Pantheon", pantheon)
    let cursor: Cursor = meta.load("cursor") || {
      cursor: 0
    }
    cursor = await pantheon.init(dir, cursor.cursor)
    Registry.register('Cursor', cursor)

    //? Folders
    const folders: Folders = new Folders(Registry)
    await folders.sync()
    Registry.register("Folders", folders)

    //? Custodian
    const custodian: Custodian = new Custodian(Registry)
    Registry.register("Custodian", custodian)

    //? Contacts
    const contactsQ: ContactsQueue = new ContactsQueue(Registry)
    Registry.register("Contacts Queue", contactsQ)

    //? Seamstress
    const seamstress: Tailor = new Tailor(Registry, {
      internal_use: true
    })
    Registry.register("Seamstress", seamstress)

    //? Cypher
    const cypher: Operator = new Operator(Registry, {
      auto_increment_cursor: false
    })
    Registry.register("Cypher", cypher)

    //? Board Rules
    const boardrulesQ: BoardRulesQueue = new BoardRulesQueue(Registry)
    Registry.register("Board Rules Queue", boardrulesQ)

    //? Resolver
    const resolver: Resolver = new Resolver(Registry, AI_BATCH_SIZE)
    Registry.register("Resolver", resolver)

    //? Tailor
    const tailor: Tailor = new Tailor(Registry, {
      internal_use: false
    })
    Registry.register("Tailor", tailor)

    //? Link
    const link: Operator = new Operator(Registry, {
      auto_increment_cursor: true,
      internal_use: false
    })
    Registry.register("Link", link)

    //? Sync
    const sync: Sync = new Sync(Registry, AI_BATCH_SIZE, THREAD_BATCH_SIZE)
    Registry.register("Sync", sync)

  }

}