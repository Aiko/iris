import Folders from "../managers/folders";
import Register from "../managers/register";
import { getLocation } from "../pantheon/pantheon";
import { PantheonProxy } from "../pantheon/puppeteer";
import { IMAPConfig, MessageID } from "../post-office/types";
import Janitor from "../utils/cleaner";
import { Logger, LumberjackEmployer } from "../utils/logger";
import Operator from "../actors/operator";
import { EmailFull, EmailWithEnvelope, EmailWithReferences } from "../utils/types";
import MessageQueue from "./MessageQueue";
import autoBind from "auto-bind";

export default class ContactsQueue implements MessageQueue {
  readonly pending: MessageID[] = []
  private readonly pantheon: PantheonProxy
  private readonly folders: Folders
  private readonly Log: Logger
  private readonly user: string

  constructor(Registry: Register) {
    this.pantheon = Registry.get("Pantheon") as PantheonProxy
    this.folders = Registry.get("Folders") as Folders
    const Lumberjack = Registry.get("Lumberjack") as LumberjackEmployer
    this.Log = Lumberjack("Contacts")
    const config = Registry.get('IMAP Config') as IMAPConfig
    this.user = config.user
    autoBind(this)
  }

  async consume(): Promise<boolean> {
    const n_pending = this.pending.length
    this.Log.time("Parsed contacts from", n_pending, "MIDs.")

    while (this.pending.length > 0) {
      const mid = this.pending.pop()
      if (mid) await this.apply(mid)
    }

    this.Log.timeEnd("Parsed contacts from", n_pending, "MIDs.")
    return true
  }
  queue(...mids: string[]): void {
    this.pending.push(...mids)
  }

  private async apply(mid: MessageID) {
    //? Find the relevant email
    const _email: EmailWithEnvelope | null =
      await this.pantheon.cache.full.check(mid) ||
      await this.pantheon.cache.content.check(mid) ||
      await this.pantheon.cache.headers.check(mid) ||
      await this.pantheon.cache.envelope.check(mid) ||
      null
    if (!_email) return this.Log.warn("MID", mid, "is not in a content-level or higher cache and will be skipped.")
    const email = Janitor.storage<EmailWithEnvelope>(_email)

    //? Check whether it has an envelope (which contains all participant info)
    if (!(email.M.envelope.mid == mid)) return this.Log.warn("MID", mid, "could not be verified and will be skipped.")

    //? Find the relevant message
    const message = await this.pantheon.db.messages.find.mid(mid)
    if (!message) return this.Log.warn("MID", mid, "does not exist in our databaase. Are you missing a call to threading?")

    //? Determine whether the email has been sent by you
    const is_sent = (
      !!(getLocation(message.locations, this.folders.sent() || '')) ||
      email.M.envelope.from.address == this.user
    )

    //? Update contact database
    if (is_sent) {
      await this.pantheon.db.contacts.update.sent(email.M.envelope.from.address, email.M.envelope.from.name)
      for (const { name, address } of email.M.envelope.to) {
        await this.pantheon.db.contacts.update.sent(address, name)
      }
    } else {
      await this.pantheon.db.contacts.update.received(email.M.envelope.from.address, email.M.envelope.from.name)
      for (const { name, address } of email.M.envelope.to) {
        await this.pantheon.db.contacts.update.received(address, name)
      }
    }
  }

}