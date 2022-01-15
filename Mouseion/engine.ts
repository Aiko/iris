import autoBind from "auto-bind";
import Mailbox from "./managers/mailbox";
import { IMAPConfig } from "./post-office/types";
import { Logger, LumberjackEmployer } from "./utils/logger";
import sleep from "./utils/sleep";

//? Mostly the core API
//! FIXME: this will break stratify until we fix it
export default class Engine {

  private readonly Log: Logger

  constructor(
    public mailbox: Mailbox
  ) {
    const Lumberjack = mailbox.Registry.get("Lumberjack") as LumberjackEmployer
    this.Log = Lumberjack("Engine")
    autoBind(this)
  }

  static async init(config: IMAPConfig) {
    console.log("Initializing engine...".green)
    const mailbox = await Mailbox.load(
      config, 500, 100
    )
    console.log("Initialized mailbox...")
    process.title = "Mouseion - " + config.user + " - Engine"
    if (!mailbox) throw "Mailbox failed to construct"
    return new Engine(mailbox)
  }

  async reconnect(config: Partial<IMAPConfig>) {
    await this.mailbox.updateConfig(config)
    return await this.mailbox.courier.network.connect(config)
  }

  sync = {
    immediate: this.mailbox.run,
    start: this.mailbox.run,
    stop: () => this.mailbox.queuedSync ? clearTimeout(this.mailbox.queuedSync) : null,
    add: this.mailbox.sync.queueForSync,
    remove: this.mailbox.sync.unqueueForSync
  }
  folders = {
    state: async () => this.mailbox.folders.state,
    sync: this.mailbox.folders.sync,
    add: this.mailbox.folders.add,
    remove: this.mailbox.folders.remove,
    boards: this.mailbox.folders.boards,
    all: this.mailbox.folders.all
  }
  resolve = {
    messages: {
      full: this.mailbox.resolver.messages.full,
      content: this.mailbox.resolver.messages.content,
      headers: this.mailbox.resolver.messages.headers,
      envelope: this.mailbox.resolver.messages.envelope,
    },
    thread: {
      full: this.mailbox.resolver.thread.full,
      content: this.mailbox.resolver.thread.content,
      headers: this.mailbox.resolver.thread.headers,
    },
    threads: {
      latest: this.mailbox.resolver.multithread.latest
    }
  }
  manage = {
    star: this.mailbox.link.star,
    unstar: this.mailbox.link.unstar,
    read: this.mailbox.link.read,
    unread: this.mailbox.link.unread,
    archive: this.mailbox.link.archive,
    copy: this.mailbox.link.copy,
    move: this.mailbox.link.move,
    delete: this.mailbox.link.delete,
  }
  contacts = {
    lookup: this.mailbox.pantheon.db.contacts.search
  }
  attachments = {
    lookup: this.mailbox.pantheon.db.attachments.search
  }
  boardRules = {
    add: this.mailbox.boardrulesQ.addRule,
    list: this.mailbox.boardrulesQ.listRules,
    queue: this.mailbox.boardrulesQ.queue,
    consume: this.mailbox.boardrulesQ.consume,
  }


  trigger = {
    register: this.mailbox.register,
    shoot: this.mailbox.trigger
  }

  API = {
    reconnect: this.reconnect.bind(this),
    close: this.close.bind(this),
    sync: this.sync,
    folders: this.folders,
    resolve: this.resolve,
    manage: this.manage,
    contacts: this.contacts,
    attachments: this.attachments,
    trigger: this.trigger,
    boardRules: this.boardRules
  }

  async close() {
    await this.mailbox.close()
    this.Log.success("Safe to exit. Killing in 1 second...")
    await sleep(1000)
    process.exit()
  }


}