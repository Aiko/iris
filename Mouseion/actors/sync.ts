//? Built to spec of RFC 4549

import Custodian from "../managers/cleaners";
import Folders from "../managers/folders";
import Register from "../managers/register";
import { getLocation } from "../pantheon/pantheon";
import { PantheonProxy } from "../pantheon/puppeteer";
import { PostOfficeProxy } from "../post-office/puppeteer";
import do_in_batch from "../utils/do-in-batch";
import { Logger, LumberjackEmployer } from "../utils/logger";
import Lock from "../utils/promise-lock";
import sequence from "../utils/sequence";
import Storage from "../utils/storage";
import { EmailWithFlags } from "../utils/types";
import Tailor from "./tailor";
import autoBind from 'auto-bind'

export default class Sync {

  private readonly Log: Logger
  private readonly meta: Storage
  private readonly pantheon: PantheonProxy
  private readonly custodian: Custodian
  private readonly courier: PostOfficeProxy
  private readonly tailor: Tailor
  private readonly folders: Folders
  private readonly syncQ: Set<string> = new Set()

  constructor(Registry: Register,
    private readonly AI_BATCH_SIZE: number,
    private readonly THREAD_BATCH_SIZE: number,
    private readonly SYNC_BATCH_SIZE: number=1
  ) {
    const Lumberjack = Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Sync')
    this.meta = Registry.get('Metadata Storage') as Storage
    this.pantheon = Registry.get('Pantheon') as PantheonProxy
    this.custodian = Registry.get('Custodian') as Custodian
    this.courier = Registry.get('Courier') as PostOfficeProxy
    this.tailor = Registry.get('Tailor') as Tailor
    this.folders = Registry.get('Folders') as Folders
    this.queueForSync(this.folders.inbox())
    this.queueForSync(this.folders.sent())
    autoBind(this)
  }

  queueForSync(...folders: (string | null)[]) {
    for(const folder of folders)
      if (folder) this.syncQ.add(folder)
  }

  unqueueForSync(...folders: (string | null)[]) {
    for (const folder of folders)
      if (folder) this.syncQ.delete(folder)
  }

  async syncAll() {
    this.Log.log("Starting bulk sync...")
    try {
      await do_in_batch([...this.syncQ], this.SYNC_BATCH_SIZE, this.sync)
      return true
    } catch (e) {
      this.Log.error("Bulk sync encountered error:", e)
      return false
    }
  }

  private async sync_existing(folder: string): Promise<number> {
    const janitor = await this.custodian.get(folder)

    const messages = await this.pantheon.db.messages.find.folder(folder)
    if (!messages || messages?.length == 0) {
      this.Log.warn(folder.blue, "| has no messages in the local database.")
      return 0;
    }
    this.Log.log("[SYNC-EXISTING]", folder.blue, "| has", messages.length, "messages in the local database.")

    const uidSet: Set<number> = new Set()
    messages.forEach(message => {
      const loc = getLocation(message.locations, folder)
      if (loc?.uid) uidSet.add(+(loc.uid))
    })
    const uids = [...uidSet].sort((a, b) => a - b)

    if (uids.length > 0) {
      this.Log.log("[SYNC-EXISTING]", folder.blue, "| syncing local UIDs.")

      this.Log.time("[SYNC-EXISTING]", folder.blue, "| fetching remote UIDs.")
      const raw_emails = await this.courier.messages.listMessagesWithFlags(folder, sequence(uids), {
        limit: 5000
      })
      this.Log.timeEnd("[SYNC-EXISTING]", folder.blue, "| fetching remote UIDs.")

      this.Log.time("[SYNC-EXISTING]", folder.blue, "| parsing remote UIDs.")
      const emails = await Promise.all(raw_emails.map(raw_email => janitor.flags(raw_email)))
      this.Log.timeEnd("[SYNC-EXISTING]", folder.blue, "| parsing remote UIDs.")

      //? wow a lookup table what is this a coding interview question?
      const lookup: Record<number, EmailWithFlags> = {}
      emails.forEach(email => lookup[email.uid] = email)

      //? use async here so you don't do queue locking on 5k+ ops
      await Promise.all(messages.map(async message => {
        const loc = getLocation(message.locations, folder)
        if (!(loc?.uid)) return;
        const uid = +(loc.uid)
        const email = lookup[uid]

        //! hey Shaggy?
        //! yea Scoob?
        //! maybe we shouldn't locally remove emails that have the \\Deleted flag
        //! because of IMAP consistencies
        //! luckily for me dogs cant talk so, wontfix

        if (!email) {
          //? email has been removed from location, reflect locally
          this.Log.warn("[SYNC-EXISTING]", folder.blue, "| MID", message.mid, "has been removed from this folder.")
          await this.pantheon.db.messages.purge.location(folder, uid)
          this.tailor.unity(message.tid)
        } else if (email.M.flags.deleted) {
          //? email has been deleted, purge locally
          this.Log.warn("[SYNC-EXISTING]", folder.blue, "| MID", message.mid, "has been deleted.")
          await this.pantheon.db.messages.purge.all(message.mid)
          this.tailor.unity(message.tid)
        } else {
          //? email still exists, sync flags
          const seen = email.M.flags.seen
          const starred = email.M.flags.starred
          await this.pantheon.db.messages.update(message.mid, {
            tid: null,
            seen, starred
          })
        }
      }))

      this.Log.success("[SYNC-EXISTING]", folder.blue, "| synced", uids.length, "messages for flags/existence.")
      return uids[uids.length - 1];
    } else {
      this.Log.warn("[SYNC-EXISTING]", folder.blue, "| did not resolve to local UIDs.")
      return 0;
    }
  }

  private async sync_lazy(folder: string, uidLatest: number, uidFullLimit: number) {
    const janitor = await this.custodian.get(folder)

    //? if UIDNext is at X, then uidFullLimit is X-FullLimit
    //? then, we lazy sync from uidHeaderLimit or uidLatest (larger of the two)
    //? all the way up to uidFullLimit
    //? thus we calculate uidHeaderLimit as uidFullLimit - HeaderLimit
    const LIMIT_HEADER_EMAILS = (folder == this.folders.inbox()) ? 2000 : 200
    const uidHeaderLimit = uidFullLimit - LIMIT_HEADER_EMAILS

    const uidMin = Math.max(uidLatest, uidHeaderLimit)
    this.Log.warn("[SYNC-LAZY]", folder.blue, "| is behind by too many messages, lazy syncing", uidFullLimit - uidMin, "emails.")

    this.Log.time("[SYNC-LAZY]", folder.blue, "| fetching remote headers.")
    const raw_emails = await this.courier.messages.listMessagesWithHeaders(folder, `${uidMin}:${uidFullLimit+1}`, {
      markAsSeen: false, parse: true, limit: LIMIT_HEADER_EMAILS
    })
    this.Log.timeEnd("[SYNC-LAZY]", folder.blue, "| fetching remote headers.")

    this.Log.time("[SYNC-LAZY]", folder.blue, "| parsing remote headers.")
    const emails = await Promise.all(raw_emails.map(raw_email => janitor.headers(raw_email)))
    this.Log.timeEnd("[SYNC-LAZY]", folder.blue, "| parsing remote headers.")

    await do_in_batch(emails, this.THREAD_BATCH_SIZE, async email => {
      if (!(email.M.envelope.mid)) return this.Log.error("[SYNC-LAZY]", folder.blue, "Message is missing MID.")
      /**
        *!FIXME: using shalow threading causes a situation:
        *? right now, below line will assign a tid but not do refs
        *? while this will still get merged by Phase 2,
        *? it will not recursively apply references
        *? thus, we need a way to thread the remaining refs later
      */
      await this.tailor.phase_1(email, {
        deepThreading: false
      })
      await this.pantheon.cache.headers.cache(email.M.envelope.mid, email)
      await this.pantheon.cache.envelope.cache(email.M.envelope.mid, email)
    })
  }

  async sync(folder: string) {
    this.Log.time("[SYNC]", folder.blue, "| Completed sync cycle.")

    //? Increment cursor
    await this.meta.store('cursor', await this.pantheon.cursor.next())

    const janitor = await this.custodian.get(folder)

    this.Log.log("[SYNC]", "Attempting to sync", folder.blue, "...")
    const folderDetails = await this.courier.folders.openFolder(folder)
    const uidNext = folderDetails?.uidNext
    if (!uidNext) return this.Log.error("[SYNC]", folder.blue, "| did not provide a UIDNext.");

    const uidLatest = (await this.sync_existing(folder)) + 1

    const LIMIT_FULL_EMAILS = (folder == this.folders.inbox()) ? 500 : 200
    const uidFullLimit = uidNext - LIMIT_FULL_EMAILS + 1
    if (uidLatest < uidFullLimit) await this.sync_lazy(folder, uidLatest, uidFullLimit)

    const uidMin = Math.max(uidLatest, uidFullLimit)
    this.Log.log("[SYNC]", folder.blue, "| Fetching full new messages in range", `${uidMin}:${uidNext}`)

    this.Log.time("[SYNC]", folder.blue, "| fetching remote in full.")
    const raw_emails = await this.courier.messages.listMessagesFull(folder, `${uidMin}:${uidNext}`, {
      bodystructure: true, parse: true,
      markAsSeen: false, limit: LIMIT_FULL_EMAILS,
      attachments: false, cids: true, //? feel free to negate these last two and cache immediately
    })
    this.Log.timeEnd("[SYNC]", folder.blue, "| fetching remote in full.")

    this.Log.time("[SYNC]", folder.blue, "| parsing remote in full.")
    const emails = await do_in_batch(raw_emails, this.AI_BATCH_SIZE, janitor.full)
    this.Log.timeEnd("[SYNC]", folder.blue, "| parsing remote in full.")

    this.Log.success("[SYNC]", folder.blue, "| Received", emails.length, "new emails.")

    await do_in_batch(emails, this.THREAD_BATCH_SIZE, async email => {
      if (!(email.M.envelope.mid)) return this.Log.error("[SYNC]", folder.blue, "Message is missing MID.")

      await this.tailor.phase_1(email, {
        deepThreading: true
      })

      email = JSON.parse(JSON.stringify(email))
      const mid = email.M.envelope.mid

      //? we don't save to the full-cache (L3 pure) because no attachments
      email.parsed.attachments = email.parsed.attachments.map((attachment: any) => {
        attachment.content = Buffer.from([])
        return attachment
      })
      await this.pantheon.cache.content.cache(mid, email)

      const partial: any = email
      partial.parsed = null
      await this.pantheon.cache.headers.cache(mid, partial)
      await this.pantheon.cache.envelope.cache(mid, partial)
    })

    return this.Log.timeEnd("[SYNC]", folder.blue, "| Completed sync cycle.")
  }

}