//? Resolves database models to their cache equivalents

import type Custodian from "@Mouseion/managers/cleaners";
import type Folders from "@Mouseion/managers/folders";
import type Register from "@Mouseion/managers/register";
import { getLocation } from "@Mouseion/pantheon/pantheon"
import type { MessageLocation, MessageModel, ThreadModel } from "@Mouseion/pantheon/pantheon";
import type { PantheonProxy } from "@Mouseion/pantheon/puppeteer";
import type { PostOfficeProxy } from "@Mouseion/post-office/puppeteer";
import type { EmailWithEnvelopeRaw, MessageID } from "@Mouseion/post-office/types";
import Janitor from "@Mouseion/utils/cleaner";
import do_in_batch from "@Mouseion/utils/do-in-batch";
import type { Logger, LumberjackEmployer } from "@Mouseion/utils/logger";
import sequence from "@Mouseion/utils/sequence";
import type { EmailBase, EmailFull, EmailWithEnvelope, EmailWithReferences } from "@Mouseion/utils/types";
import autoBind from 'auto-bind'
import { performance } from "perf_hooks"


export default class Resolver {

  private readonly Log: Logger
  readonly messages: MessageResolver
  readonly thread: ThreadResolver
  readonly multithread: MultiThreadResolver

  constructor(Registry: Register, private readonly AI_BATCH_SIZE: number) {
    const Lumberjack = Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Resolver')
    this.messages = new MessageResolver(Registry)
    this.thread = new ThreadResolver(Registry, AI_BATCH_SIZE)
    this.multithread = new MultiThreadResolver(Registry, AI_BATCH_SIZE)
    autoBind(this)
  }

}

type Resolved<T extends EmailBase> = T & {
  locations: MessageLocation[],
  mid: MessageID,
  tid: string,
  timestamp: Date,
  db_audit_log: string[]
}
type ResolvedThread<T extends EmailBase> = ThreadModel & {
  emails: Resolved<T>[],
  resolver_audit_log: string[]
}
const resolve = <T extends EmailWithEnvelope>(email: T, message: MessageModel): Resolved<T> => {
  email = Janitor.storage<T>(email)
  const resolved: Resolved<T> = {
    ...email,
    locations: message.locations,
    mid: message.mid,
    tid: message.tid,
    timestamp: new Date(message.timestamp),
    db_audit_log: message.audit_log
  }
  return resolved
}
const resolveThread = <T extends EmailWithEnvelope>(emails: Resolved<T>[], thread: ThreadModel, audit_log: string[]) => {
  emails = emails.sort((a, b) => b.M.envelope.date.valueOf() - a.M.envelope.date.valueOf())
  const resolved: ResolvedThread<T> = {
    ...thread,
    emails,
    resolver_audit_log: audit_log
  }
  return resolved
}
const resolveThreads = <T extends EmailWithEnvelope>(emails: Resolved<T>[], threads: ThreadModel[], audit_logs: {[tid: string]: string[]}) => {
  const tids: string[] = []
  const tid2email: Record<string, Resolved<T>[]> = {}
  const tid2thread: Record<string, ThreadModel> = {}
  for (const thread of threads) {
    tids.push(thread.tid)
    tid2thread[thread.tid] = thread
    tid2email[thread.tid] = []
  }
  for (const email of emails) {
    if (!(tids.includes(email.tid))) continue;
    tid2email[email.tid].push(email)
  }
  const resolvedThreads: ResolvedThread<T>[] = []
  for (const tid of tids) {
    const resolvedThread = resolveThread<T>(tid2email[tid], tid2thread[tid], audit_logs[tid] || ["error: no audit log found"])
    resolvedThread.date = new Date(resolvedThread.date)
    resolvedThreads.push(resolvedThread)
  }

  return resolvedThreads.sort((t1, t2) => t2.date.valueOf() - t1.date.valueOf())
}

class MessageResolver {

  private readonly Log: Logger
  private readonly pantheon: PantheonProxy
  private readonly custodian: Custodian
  private readonly courier: PostOfficeProxy

  constructor(Registry: Register) {
    const Lumberjack = Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Resolver/Message')
    this.pantheon = Registry.get('Pantheon') as PantheonProxy
    this.custodian = Registry.get('Custodian') as Custodian
    this.courier = Registry.get('Courier') as PostOfficeProxy
    autoBind(this)
  }

  async full(MID: MessageID): Promise<Resolved<EmailFull> | null> {
    const message = await this.pantheon.db.messages.find.mid(MID)
    if (!message) {
      this.Log.error("MID", MID, "does not exist in our database.")
      return null
    }

    let email: EmailFull | null = await this.pantheon.cache.full.check(MID) || null

    //? Don't have it locally? fetch from remote and cache
    if (!email) {
      //? Pick a location
      const { folder, uid } = message.locations?.[0]
      const janitor = await this.custodian.get(folder)
      const raw_email = (await this.courier.messages.listMessagesFull(folder, '' + uid, {
        bodystructure: true,
        parse: true,
        markAsSeen: false,
        attachments: true,
        cids: false,
        limit: 1
      }))?.[0]
      if (!raw_email) return null;

      email = await janitor.full(raw_email)

      //? Cache the email locally
      await this.pantheon.cache.full.cache(MID, email)
      const content: any = JSON.parse(JSON.stringify(email))
      content.parsed.attachments = content.parsed.attachments.map((attachment: any) => {
        attachment.content = Buffer.from([])
        return attachment
      })
      await this.pantheon.cache.content.cache(MID, content)
      const partial: any = JSON.parse(JSON.stringify(content))
      partial.parsed = null
      await this.pantheon.cache.headers.cache(MID, partial)
      await this.pantheon.cache.envelope.cache(MID, partial)
    }

    //? Update flags to maintain sync state
    email.M.flags.seen = message.seen
    email.M.flags.starred = message.starred
    const resolved = resolve<EmailFull>(email, message)

    return resolved
  }

  async content(MID: MessageID): Promise<Resolved<EmailFull> | null> {
    const message = await this.pantheon.db.messages.find.mid(MID)
    if (!message) {
      this.Log.error("MID", MID, "does not exist in our database.")
      return null
    }

    let email: EmailFull | null = await this.pantheon.cache.content.check(MID) || null

    //? Don't have it locally? fetch from remote and cache
    if (!email) {
      //? Pick a location
      const { folder, uid } = message.locations?.[0]
      const janitor = await this.custodian.get(folder)
      const raw_email = (await this.courier.messages.listMessagesFull(folder, '' + uid, {
        bodystructure: true,
        parse: true,
        markAsSeen: false,
        attachments: false,
        cids: true,
        limit: 1
      }))?.[0]
      if (!raw_email) return null;

      email = await janitor.full(raw_email)
      email = JSON.parse(JSON.stringify(email)) as EmailFull

      //? Cache the email locally
      email.parsed.attachments = email.parsed.attachments.map((attachment: any) => {
        attachment.content = Buffer.from([])
        return attachment
      })
      await this.pantheon.cache.content.cache(MID, email)
      const partial: any = JSON.parse(JSON.stringify(email))
      partial.parsed = null
      await this.pantheon.cache.headers.cache(MID, partial)
      await this.pantheon.cache.envelope.cache(MID, partial)
    }

    //? Update flags to maintain sync state
    email.M.flags.seen = message.seen
    email.M.flags.starred = message.starred
    const resolved = resolve<EmailFull>(email, message)

    return resolved
  }

  async headers(MID: MessageID): Promise<Resolved<EmailWithReferences> | null> {
    const message = await this.pantheon.db.messages.find.mid(MID)
    if (!message) {
      this.Log.error("MID", MID, "does not exist in our database.")
      return null
    }

    let email: EmailWithReferences | null = await this.pantheon.cache.headers.check(MID) || null

    //? Don't have it locally? fetch from remote and cache
    if (!email) {
      //? Pick a location
      const { folder, uid } = message.locations?.[0]
      const janitor = await this.custodian.get(folder)
      const raw_email = (await this.courier.messages.listMessagesWithHeaders(folder, '' + uid, {
        parse: true,
        markAsSeen: false,
        limit: 1
      }))?.[0]
      if (!raw_email) return null;

      email = await janitor.headers(raw_email)
      email = JSON.parse(JSON.stringify(email)) as EmailWithReferences

      //? Cache the email locally
      await this.pantheon.cache.headers.cache(MID, email)
      await this.pantheon.cache.envelope.cache(MID, email)
    }

    //? Update flags to maintain sync state
    email.M.flags.seen = message.seen
    email.M.flags.starred = message.starred
    const resolved = resolve<EmailWithReferences>(email, message)

    return resolved
  }

  async envelope(MID: MessageID): Promise<Resolved<EmailWithEnvelope> | null> {
    const message = await this.pantheon.db.messages.find.mid(MID)
    if (!message) {
      this.Log.error("MID", MID, "does not exist in our database.")
      return null
    }

    let email: EmailWithEnvelope | null = await this.pantheon.cache.envelope.check(MID) || null

    //? Don't have it locally? fetch from remote and cache
    if (!email) {
      //? Pick a location
      const { folder, uid } = message.locations?.[0]
      const janitor = await this.custodian.get(folder)
      const raw_email = (await this.courier.messages.listMessagesWithEnvelopes(folder, '' + uid, {
        limit: 1
      }))?.[0]
      if (!raw_email) return null;

      email = await janitor.envelope(raw_email)
      email = JSON.parse(JSON.stringify(email)) as EmailWithEnvelope

      //? Cache the email locally
      await this.pantheon.cache.envelope.cache(MID, email)
    }

    //? Update flags to maintain sync state
    email.M.flags.seen = message.seen
    email.M.flags.starred = message.starred
    const resolved = resolve<EmailWithEnvelope>(email, message)

    return resolved
  }

}

type FetchTarget = {
  uid: string | number,
  message: MessageModel
}
type FetchPlan = Record<string, FetchTarget[]>

class ThreadResolver {

  private readonly Log: Logger
  private readonly pantheon: PantheonProxy
  private readonly custodian: Custodian
  private readonly courier: PostOfficeProxy
  private readonly folders: Folders
  private readonly ENABLE_AUDITING: boolean

  constructor(Registry: Register, private readonly AI_BATCH_SIZE: number) {
    const Lumberjack = Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Resolver/Thread')
    this.pantheon = Registry.get('Pantheon') as PantheonProxy
    this.custodian = Registry.get('Custodian') as Custodian
    this.courier = Registry.get('Courier') as PostOfficeProxy
    this.folders = Registry.get('Folders') as Folders
    this.ENABLE_AUDITING = Registry.get('ENABLE_AUDITING')
    autoBind(this)
  }

  plan(need: MessageModel[], thread: ThreadModel): {plan: FetchPlan, audit_log: string[]} {
    const plan: FetchPlan = {}

    const audit_log: string[] = []

    const plot = (location: MessageLocation, message: MessageModel) => {
      const folder = location.folder
      if (!(plan[folder])) plan[folder] = []
      const target: FetchTarget = {
        uid: location.uid,
        message,
      }
      plan[folder].push(target)
    }

    for (const message of need) {
      if (message.locations.length == 0) {
        this.Log.warn("MID", message.mid, "has no locations and should be purged.")
        continue;
      }

      let loc: MessageLocation | null = null

      //? First, try the thread's main folder
      loc = getLocation(message.locations, thread.folder)
      if (loc) {
        plot(loc, message);
        audit_log.push("[plan] message was in thread's main folder")
        continue;
      }

      //? Next, look for a shortcut
      loc = message.locations.filter(({ folder }) => !!(plan[folder]))?.[0]
      if (loc) {
        plot(loc, message);
        audit_log.push("[plan] message was in a folder we are already planning to fetch")
        continue;
      }

      //? Then, try the inbox
      loc = getLocation(message.locations, this.folders.inbox() || '')
      if (loc) {
        plot(loc, message);
        audit_log.push("[plan] message was in inbox")
        continue;
      }

      //? Lastly, try the sent folder
      loc = getLocation(message.locations, this.folders.sent() || '')
      if (loc) {
        plot(loc, message);
        audit_log.push("[plan] message was in sent")
        continue;
      }

      //? If all else fails just add the first folder
      loc = message.locations[0]
      if (loc) {
        plot(loc, message);
        audit_log.push("[plan] using first location as fallback")
        continue;
      }
    }
    return {plan, audit_log: this.ENABLE_AUDITING ? audit_log : []}
  }

  async full(TID: string): Promise<ResolvedThread<EmailFull> | null> {
    const thread = await this.pantheon.db.threads.find.tid(TID)
    if (!thread) {
      this.Log.error("TID", TID, "does not exist in our database.")
      return null
    }
    const messages = await this.pantheon.db.threads.messages(TID)
    if (!messages || messages.length == 0) {
      this.Log.warn("TID", TID, "does not have messages?")
      return null
    }
    const audit_log: string[] = ["found thread and messages in db"]

    const have: Resolved<EmailFull>[] = []
    const need: MessageModel[] = []
    await Promise.all(messages.map(async message => {
      const email = await this.pantheon.cache.full.check(message.mid) || null
      if (!email) {
        audit_log.push(`did not have cache entry for message ${message.mid}`)
        need.push(message)
        return
      }
      audit_log.push(`found cache entry for message ${message.mid}`)
      email.M.flags.seen = message.seen
      email.M.flags.starred = message.starred
      const resolved = resolve<EmailFull>(email, message)
      have.push(resolved)
    }))

    //? Build plan
    const Plan = this.plan(need, thread)
    const { plan } = Plan
    audit_log.push(...Plan.audit_log)

    //? Execute plan
    const folders = Object.keys(plan)
    for (const folder of folders) {
      const janitor = await this.custodian.get(folder)

      const lookup: Record<string | number, MessageModel> = {}
      const uids = plan[folder].map(({ uid, message }) => {
        lookup[message.mid] = message
        return uid
      })

      const raw_emails = await this.courier.messages.listMessagesFull(folder, sequence(uids), {
        bodystructure: true,
        parse: true,
        markAsSeen: false,
        attachments: true,
        cids: false,
        limit: uids.length
      })
      audit_log.push(`[fetch] got ${raw_emails.length} messages from ${folder}`)

      const emails = await do_in_batch(raw_emails, this.AI_BATCH_SIZE, janitor.full)
      await Promise.all(emails.map(async email => {
        const message = lookup[email.M.envelope.mid]
        if (!message) return this.Log.error("FULL - Something went wrong in populating the lookup table.")
        email = JSON.parse(JSON.stringify(email))
        const MID = message.mid
        await this.pantheon.cache.full.cache(MID, email)
        const maybeEmail = await this.pantheon.cache.full.check(MID)
        if (!maybeEmail) {
          audit_log.push(`[fetch] tried to do a refresh off of full cache, failed`)
        } else email = maybeEmail
        const resolved = resolve<EmailFull>(email, message)
        audit_log.push(`[fetch] resolved ${message.mid}`)
        have.push(resolved)
        const content: any = JSON.parse(JSON.stringify(email))
        content.parsed.attachments = content.parsed.attachments.map((attachment: any) => {
          attachment.content = Buffer.from([])
          return attachment
        })
        await this.pantheon.cache.content.cache(MID, content)
        const partial: any = JSON.parse(JSON.stringify(content))
        partial.parsed = null
        await this.pantheon.cache.headers.cache(MID, partial)
        await this.pantheon.cache.envelope.cache(MID, partial)
      }))

    }

    const emails = have.sort((a, b) => b.M.envelope.date.valueOf() - a.M.envelope.date.valueOf())
    return resolveThread<EmailFull>(emails, thread, this.ENABLE_AUDITING ? audit_log : [])
  }

  async content(TID: string): Promise<ResolvedThread<EmailFull> | null> {
    const thread = await this.pantheon.db.threads.find.tid(TID)
    if (!thread) {
      this.Log.error("TID", TID, "does not exist in our database.")
      return null
    }
    const messages = await this.pantheon.db.threads.messages(TID)
    if (!messages || messages.length == 0) {
      this.Log.warn("TID", TID, "does not have messages?")
      return null
    }
    const audit_log: string[] = ["found thread and messages in db"]

    const have: Resolved<EmailFull>[] = []
    const need: MessageModel[] = []
    await Promise.all(messages.map(async message => {
      const email = await this.pantheon.cache.content.check(message.mid) || null
      if (!email) {
        need.push(message)
        audit_log.push(`did not have cache entry for message ${message.mid}`)
        return
      }
      audit_log.push(`found cache entry for message ${message.mid}`)
      email.M.flags.seen = message.seen
      email.M.flags.starred = message.starred
      const resolved = resolve<EmailFull>(email, message)
      have.push(resolved)
    }))

    //? Build plan
    const Plan = this.plan(need, thread)
    const { plan } = Plan
    audit_log.push(...Plan.audit_log)

    //? Execute plan, using attachment level fetching anyways
    const folders = Object.keys(plan)
    for (const folder of folders) {
      const janitor = await this.custodian.get(folder)

      const lookup: Record<string | number, MessageModel> = {}
      const uids = plan[folder].map(({ uid, message }) => {
        lookup[message.mid] = message
        return uid
      })

      const raw_emails = await this.courier.messages.listMessagesFull(folder, sequence(uids), {
        bodystructure: true,
        parse: true,
        markAsSeen: false,
        attachments: true,
        cids: false,
        limit: uids.length
      })
      audit_log.push(`[fetch] got ${raw_emails.length} messages from ${folder}`)

      const emails = await do_in_batch(raw_emails, this.AI_BATCH_SIZE, janitor.full)
      await Promise.all(emails.map(async email => {
        const message = lookup[email.M.envelope.mid]
        if (!message) return this.Log.error("CONTENT - Something went wrong in populating the lookup table.")
        const resolved = resolve<EmailFull>(email, message)
        audit_log.push(`[fetch] resolved ${message.mid}`)
        have.push(resolved)
        email = JSON.parse(JSON.stringify(email))
        const MID = message.mid
        await this.pantheon.cache.full.cache(MID, email)
        const content: any = JSON.parse(JSON.stringify(email))
        content.parsed.attachments = content.parsed.attachments.map((attachment: any) => {
          attachment.content = Buffer.from([])
          return attachment
        })
        await this.pantheon.cache.content.cache(MID, content)
        const partial: any = JSON.parse(JSON.stringify(content))
        partial.parsed = null
        await this.pantheon.cache.headers.cache(MID, partial)
        await this.pantheon.cache.envelope.cache(MID, partial)
      }))

    }

    const emails = have.sort((a, b) => b.M.envelope.date.valueOf() - a.M.envelope.date.valueOf())
    return resolveThread<EmailFull>(emails, thread, this.ENABLE_AUDITING ? audit_log : [])
  }

  async headers(TID: string): Promise<ResolvedThread<EmailWithReferences> | null> {
    const thread = await this.pantheon.db.threads.find.tid(TID)
    if (!thread) {
      this.Log.error("TID", TID, "does not exist in our database.")
      return null
    }
    const messages = await this.pantheon.db.threads.messages(TID)
    if (!messages || messages.length == 0) {
      this.Log.warn("TID", TID, "does not have messages?")
      return null
    }
    const audit_log: string[] = ["found thread and messages in db"]

    const have: Resolved<EmailWithReferences>[] = []
    const need: MessageModel[] = []
    await Promise.all(messages.map(async message => {
      const email = await this.pantheon.cache.headers.check(message.mid) || null
      if (!email) {
        audit_log.push(`did not have cache entry for message ${message.mid}`)
        need.push(message)
        return
      }
      audit_log.push(`found cache entry for message ${message.mid}`)
      email.M.flags.seen = message.seen
      email.M.flags.starred = message.starred
      const resolved = resolve<EmailWithReferences>(email, message)
      have.push(resolved)
    }))

    //? Build plan
    const Plan = this.plan(need, thread)
    const { plan } = Plan
    audit_log.push(...Plan.audit_log)

    //? Execute plan
    const folders = Object.keys(plan)
    for (const folder of folders) {
      const janitor = await this.custodian.get(folder)

      const lookup: Record<string | number, MessageModel> = {}
      const uids = plan[folder].map(({ uid, message }) => {
        lookup[message.mid] = message
        return uid
      })

      const raw_emails = await this.courier.messages.listMessagesWithHeaders(folder, sequence(uids), {
        parse: true,
        markAsSeen: false,
        limit: uids.length
      })
      audit_log.push(`[fetch] got ${raw_emails.length} messages from ${folder}`)

      const emails = await do_in_batch(raw_emails, this.AI_BATCH_SIZE, janitor.headers)
      await Promise.all(emails.map(async email => {
        const message = lookup[email.M.envelope.mid]
        if (!message) return this.Log.error("HEADERS - Something went wrong in populating the lookup table.")
        const resolved = resolve<EmailWithReferences>(email, message)
        audit_log.push(`[fetch] resolved ${message.mid}`)
        have.push(resolved)
        email = JSON.parse(JSON.stringify(email))
        const MID = message.mid
        await this.pantheon.cache.headers.cache(MID, email)
        await this.pantheon.cache.envelope.cache(MID, email)
      }))

    }

    const emails = have.sort((a, b) => b.M.envelope.date.valueOf() - a.M.envelope.date.valueOf())
    return resolveThread<EmailWithReferences>(emails, thread, this.ENABLE_AUDITING ? audit_log : [])
  }

}

class MultiThreadResolver {

  private readonly Log: Logger
  private readonly pantheon: PantheonProxy
  private readonly custodian: Custodian
  private readonly courier: PostOfficeProxy
  private readonly folders: Folders
  private readonly ENABLE_AUDITING: boolean

  constructor(Registry: Register, private readonly AI_BATCH_SIZE: number) {
    const Lumberjack = Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Resolver/MultiThread')
    this.pantheon = Registry.get('Pantheon') as PantheonProxy
    this.custodian = Registry.get('Custodian') as Custodian
    this.courier = Registry.get('Courier') as PostOfficeProxy
    this.folders = Registry.get('Folders') as Folders
    this.ENABLE_AUDITING = Registry.get('ENABLE_AUDITING') as boolean
    autoBind(this)
  }

  plan(need: MessageModel[], threads: ThreadModel[]): {plan: FetchPlan, audit_logs: {[tid: string]: string[]}} {
    const plan: FetchPlan = {}
    const audit_logs: {[tid: string]: string[]} = {}

    for (const thread of threads) {
      audit_logs[thread.tid] = []
    }

    const plot = (location: MessageLocation, message: MessageModel) => {
      const folder = location.folder
      if (!(plan[folder])) plan[folder] = []
      const target: FetchTarget = {
        uid: location.uid,
        message,
      }
      plan[folder].push(target)
    }

    for (const message of need) {
      if (message.locations.length == 0) {
        this.Log.warn("MID", message.mid, "has no locations and should be purged.")
        continue;
      }
      const thread: ThreadModel | null = threads.filter(({ tid }) => tid == message.tid)?.[0]
      if (!thread) {
        this.Log.warn("MID", message.mid, "was not able to find its thread and so will be skipped.")
        continue;
      }

      let loc: MessageLocation | null = null

      //? First, try the thread's main folder
      loc = getLocation(message.locations, thread.folder)
      if (loc) {
        plot(loc, message);
        audit_logs[thread.tid].push(`[plan] message ${message.mid} was in thread's main folder`)
        continue;
      }

      //? Next, look for a shortcut
      loc = message.locations.filter(({ folder }) => !!(plan[folder]))?.[0]
      if (loc) {
        plot(loc, message);
        audit_logs[thread.tid].push(`[plan] message ${message.mid} was in a folder we are already planning to fetch`)
        continue;
      }

      //? Then, try the inbox
      loc = getLocation(message.locations, this.folders.inbox() || '')
      if (loc) {
        plot(loc, message);
        audit_logs[thread.tid].push(`[plan] message ${message.mid} was in inbox`)
        continue;
      }

      //? Lastly, try the sent folder
      loc = getLocation(message.locations, this.folders.sent() || '')
      if (loc) {
        plot(loc, message);
        audit_logs[thread.tid].push(`[plan] message ${message.mid} was in sent`)
        continue;
      }

      //? If all else fails just add the first folder
      loc = message.locations[0]
      if (loc) {
        plot(loc, message);
        audit_logs[thread.tid].push(`[plan] message ${message.mid} is using first location as fallback`)
        continue;
      }
    }
    return {plan, audit_logs: this.ENABLE_AUDITING ? audit_logs : {}}
  }

  async byTIDs(tids: string[]): Promise<ResolvedThread<EmailFull>[]> {
    const folder = "BY TIDs"
    this.Log.log(folder.blue, "Building thread delta...")
    const _threads = await Promise.all(tids.map(async tid => this.pantheon.db.threads.find.tid(tid)))
    if (!_threads) {
      this.Log.error(folder.blue, "| threads do not exist in our database.")
      return []
    }
    if (_threads.length == 0) {
      this.Log.warn(folder.blue, "| has no threads in the database.")
      return []
    }
    const threads = _threads.filter(thread => !!thread) as ThreadModel[]
    this.Log.log(folder.blue, "| has", threads.length, "threads to process.")

    const audit_logs: {[tid: string]: string[]} = {}

    const messages: MessageModel[] = []
    for (const thread of threads) {
      audit_logs[thread.tid] = []
      const msgs = await this.pantheon.db.threads.messages(thread.tid)
      if (!msgs || msgs.length == 0) {
        this.Log.warn(folder, "TID", thread.tid, "does not have messages?")
        continue;
      }
      //! we only push the latest 10 messages as that's all we're concerned with
      messages.push(...(msgs.slice(0, 10)))
      audit_logs[thread.tid].push(`assembled ${messages.length} messages`)
    }
    if (messages.length == 0) {
      if (threads.length > 0) this.Log.warn(folder, "Latest TIDs do not have messages?")
      return []
    }
    this.Log.log(folder.blue, "Built shallow delta...")

    const have: Resolved<EmailFull>[] = []
    const need: MessageModel[] = []
    const rtCheck: number[] = [] //? runtimes of cache checks

    await Promise.all(messages.map(async message => {
      const t0 = performance.now()
      const email = await this.pantheon.cache.content.check(message.mid) || null
      rtCheck.push(performance.now() - t0)
      if (!audit_logs[message.tid]) {
        this.Log.warn(`TID ${message.tid} does not need to be resolved but has backwards pointer.`)
        audit_logs[message.tid] = ["TID is not needed... wtf?"]
      }
      if (!email) {
        need.push(message)
        audit_logs[message.tid].push(`message ${message.mid} is NOT cached`)
        return
      }
      email.M.flags.seen = message.seen
      email.M.flags.starred = message.starred
      const resolved = resolve<EmailFull>(email, message)
      have.push(resolved)
      audit_logs[message.tid].push(`already have message ${message.mid}`)
    }))
    this.Log.log(folder, "Built partial deep thread delta.")
    this.Log.log(folder, "Check avg time:", rtCheck.reduce((a, b) => a + b) / rtCheck.length, rtCheck)

    //? Build plan
    const Plan = this.plan(need, threads)
    const { plan } = Plan
    for (const thread of threads) {
      if (Plan.audit_logs[thread.tid]?.length > 0) {
        audit_logs[thread.tid].push(...(Plan.audit_logs[thread.tid]))
      }
    }
    this.Log.log(folder, "Assembled fetch plan...")

    //? Execute plan
    const folders = Object.keys(plan)
    const Folder = folder
    for (const folder of folders) {
      const janitor = await this.custodian.get(folder)

      //? Populate lookup table
      const lookup: Record<string | number, MessageModel> = {}
      const uids = plan[folder].map(({ uid, message }) => {
        lookup[message.mid] = message
        return uid
      })

      const count = uids.length
      this.Log.time(Folder, "Fetched", count, "relevant emails from", folder)
      const raw_emails = await this.courier.messages.listMessagesFull(folder, sequence(uids), {
        bodystructure: true,
        parse: true,
        markAsSeen: false,
        attachments: true,
        cids: false,
        limit: uids.length
      })
      this.Log.timeEnd(Folder, "Fetched", count, "relevant emails from", folder)


      const emails = await do_in_batch(raw_emails, this.AI_BATCH_SIZE, janitor.full)
      await Promise.all(emails.map(async email => {
        const _MID = email.M.envelope.mid
        if (!_MID) return this.Log.warn(Folder, "LATEST - cannot check lookup table without qualifying MID for email in", folder)
        const message = lookup[email.M.envelope.mid]
        if (!message) return; //* there will be extras due to the way we construct sequences
        const resolved = resolve<EmailFull>(email, message)
        have.push(resolved)
        audit_logs[message.tid].push(`resolved message ${message.mid}`)
        email = JSON.parse(JSON.stringify(email))
        const MID = message.mid
        await this.pantheon.cache.full.cache(MID, email)
        const content: any = JSON.parse(JSON.stringify(email))
        content.parsed.attachments = content.parsed.attachments.map((attachment: any) => {
          attachment.content = Buffer.from([])
          return attachment
        })
        await this.pantheon.cache.content.cache(MID, content)
        const partial: any = JSON.parse(JSON.stringify(content))
        partial.parsed = null
        await this.pantheon.cache.headers.cache(MID, partial)
        await this.pantheon.cache.envelope.cache(MID, partial)
      }))

    }
    this.Log.log(folder, "Completed deep thread delta.")

    const resolved: ResolvedThread<EmailFull>[] = resolveThreads<EmailFull>(have, threads, this.ENABLE_AUDITING ? audit_logs : {})
    return resolved
  }

  async latest(folder: string, minCursor: number, {limit=5000, start=0, loose=false} ={}): Promise<{all: ThreadModel[], updated: ResolvedThread<EmailFull>[], msgs?: MessageModel[]}> {
    this.Log.log(folder.blue, "Building thread delta...")
    const _threads = await this.pantheon.db.threads.find.latest(folder, { limit, start, loose })
    if (!_threads) {
      this.Log.error(folder.blue, "| threads do not exist in our database.")
      return {all: [], updated: []}
    }
    if (_threads.length == 0) {
      this.Log.warn(folder.blue, "| has no threads in the database.")
      const msgs = (await this.pantheon.db.messages.find.folder(folder, { limit })) ?? []
      if (msgs.length > 0) {
        this.Log.error(folder.blue, "| has messages but no threads!")
      }
      return {all: [], updated: [], msgs}
    }
    const threads = _threads.filter(({ cursor }) => cursor > minCursor)
    this.Log.log(folder.blue, "| has", threads.length, "threads to process.")

    const audit_logs: {[tid: string]: string[]} = {}

    const messages: MessageModel[] = []
    for (const thread of threads) {
      audit_logs[thread.tid] = []
      const msgs = await this.pantheon.db.threads.messages(thread.tid)
      if (!msgs || msgs.length == 0) {
        this.Log.warn(folder, "TID", thread.tid, "does not have messages?")
        continue;
      }
      //! we only push the latest 10 messages as that's all we're concerned with
      messages.push(...(msgs.slice(0, 10)))
      audit_logs[thread.tid].push(`assembled ${messages.length} messages`)
    }
    if (messages.length == 0) {
      if (threads.length > 0) this.Log.warn(folder, "Latest TIDs do not have messages?")
      return {all: _threads, updated: []}
    }
    this.Log.log(folder.blue, "Built shallow delta...")

    const have: Resolved<EmailFull>[] = []
    const need: MessageModel[] = []
    const rtCheck: number[] = [] //? runtimes of cache checks

    await Promise.all(messages.map(async message => {
      const t0 = performance.now()
      const email = await this.pantheon.cache.content.check(message.mid) || null
      rtCheck.push(performance.now() - t0)
      if (!audit_logs[message.tid]) {
        this.Log.warn(`TID ${message.tid} does not need to be resolved but has backwards pointer.`)
        audit_logs[message.tid] = ["TID is not needed... wtf?"]
      }
      if (!email) {
        need.push(message)
        audit_logs[message.tid].push(`message ${message.mid} is NOT cached`)
        return
      }
      email.M.flags.seen = message.seen
      email.M.flags.starred = message.starred
      const resolved = resolve<EmailFull>(email, message)
      have.push(resolved)
      audit_logs[message.tid].push(`already have message ${message.mid}`)
    }))
    this.Log.log(folder, "Built partial deep thread delta.")
    this.Log.log(folder, "Check avg time:", rtCheck.reduce((a, b) => a + b) / rtCheck.length, rtCheck)

    //? Build plan
    const Plan = this.plan(need, threads)
    const { plan } = Plan
    for (const thread of threads) {
      if (Plan.audit_logs[thread.tid]?.length > 0) {
        audit_logs[thread.tid].push(...(Plan.audit_logs[thread.tid]))
      }
    }
    this.Log.log(folder, "Assembled fetch plan...")

    //? Execute plan
    const folders = Object.keys(plan)
    const Folder = folder
    for (const folder of folders) {
      const janitor = await this.custodian.get(folder)

      //? Populate lookup table
      const lookup: Record<string | number, MessageModel> = {}
      const uids = plan[folder].map(({ uid, message }) => {
        lookup[message.mid] = message
        return uid
      })

      const count = uids.length
      this.Log.time(Folder, "Fetched", count, "relevant emails from", folder)
      const raw_emails = await this.courier.messages.listMessagesFull(folder, sequence(uids), {
        bodystructure: true,
        parse: true,
        markAsSeen: false,
        attachments: true,
        cids: false,
        limit: uids.length
      })
      this.Log.timeEnd(Folder, "Fetched", count, "relevant emails from", folder)


      const emails = await do_in_batch(raw_emails, this.AI_BATCH_SIZE, janitor.full)
      await Promise.all(emails.map(async email => {
        const _MID = email.M.envelope.mid
        if (!_MID) return this.Log.warn(Folder, "LATEST - cannot check lookup table without qualifying MID for email in", folder)
        const message = lookup[email.M.envelope.mid]
        if (!message) return; //* there will be extras due to the way we construct sequences
        const resolved = resolve<EmailFull>(email, message)
        have.push(resolved)
        audit_logs[message.tid].push(`resolved message ${message.mid}`)
        email = JSON.parse(JSON.stringify(email))
        const MID = message.mid
        await this.pantheon.cache.full.cache(MID, email)
        const content: any = JSON.parse(JSON.stringify(email))
        content.parsed.attachments = content.parsed.attachments.map((attachment: any) => {
          attachment.content = Buffer.from([])
          return attachment
        })
        await this.pantheon.cache.content.cache(MID, content)
        const partial: any = JSON.parse(JSON.stringify(content))
        partial.parsed = null
        await this.pantheon.cache.headers.cache(MID, partial)
        await this.pantheon.cache.envelope.cache(MID, partial)
      }))

    }
    this.Log.log(folder, "Completed deep thread delta.")

    const resolved: ResolvedThread<EmailFull>[] = resolveThreads<EmailFull>(have, threads, this.ENABLE_AUDITING ? audit_logs : {})
    return {all: _threads, updated: resolved}
  }

}