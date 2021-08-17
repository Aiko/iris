//? Resolves database models to their cache equivalents

import Custodian from "../managers/cleaners";
import Folders from "../managers/folders";
import Register from "../managers/register";
import { getLocation, MessageLocation, MessageModel, ThreadModel } from "../pantheon/pantheon";
import { PantheonProxy } from "../pantheon/puppeteer";
import { PostOfficeProxy } from "../post-office/puppeteer";
import { EmailWithEnvelopeRaw, MessageID } from "../post-office/types";
import Janitor from "../utils/cleaner";
import do_in_batch from "../utils/do-in-batch";
import { Logger, LumberjackEmployer } from "../utils/logger";
import sequence from "../utils/sequence";
import { EmailBase, EmailFull, EmailWithEnvelope, EmailWithReferences } from "../utils/types";
import Tailor from "./tailor";
import autoBind from 'auto-bind'
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
  timestamp: Date
}
type ResolvedThread<T extends EmailBase> = ThreadModel & {
  emails: Resolved<T>[]
}
const resolve = <T extends EmailWithEnvelope>(email: T, message: MessageModel): Resolved<T> => {
  email = Janitor.storage<T>(email)
  const resolved: Resolved<T> = {
    ...email,
    locations: message.locations,
    mid: message.mid,
    tid: message.tid,
    timestamp: new Date(message.timestamp)
  }
  return resolved
}
const resolveThread = <T extends EmailWithEnvelope>(emails: Resolved<T>[], thread: ThreadModel) => {
  emails = emails.sort((a, b) => b.M.envelope.date.valueOf() - a.M.envelope.date.valueOf())
  const resolved: ResolvedThread<T> = {
    ...thread,
    emails,
  }
  return resolved
}
const resolveThreads = <T extends EmailWithEnvelope>(emails: Resolved<T>[], threads: ThreadModel[]) => {
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
    const resolvedThread = resolveThread<T>(tid2email[tid], tid2thread[tid])
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

  constructor(Registry: Register, private readonly AI_BATCH_SIZE: number) {
    const Lumberjack = Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Resolver/Thread')
    this.pantheon = Registry.get('Pantheon') as PantheonProxy
    this.custodian = Registry.get('Custodian') as Custodian
    this.courier = Registry.get('Courier') as PostOfficeProxy
    this.folders = Registry.get('Folders') as Folders
    autoBind(this)
  }

  plan(need: MessageModel[], thread: ThreadModel): FetchPlan {
    const plan: FetchPlan = {}

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
      if (loc) { plot(loc, message); continue; }

      //? Next, look for a shortcut
      loc = message.locations.filter(({ folder }) => !!(plan[folder]))?.[0]
      if (loc) { plot(loc, message); continue; }

      //? Then, try the inbox
      loc = getLocation(message.locations, this.folders.inbox() || '')
      if (loc) { plot(loc, message); continue; }

      //? Lastly, try the sent folder
      loc = getLocation(message.locations, this.folders.sent() || '')
      if (loc) { plot(loc, message); continue; }

      //? If all else fails just add the first folder
      loc = message.locations[0]
      if (loc) { plot(loc, message); continue; }
    }
    return plan
  }

  async full(TID: string): Promise<Resolved<EmailFull>[] | null> {
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

    const have: Resolved<EmailFull>[] = []
    const need: MessageModel[] = []
    await Promise.all(messages.map(async message => {
      const email = await this.pantheon.cache.full.check(message.mid) || null
      if (!email) {
        need.push(message)
        return
      }
      email.M.flags.seen = message.seen
      email.M.flags.starred = message.starred
      const resolved = resolve<EmailFull>(email, message)
      have.push(resolved)
    }))

    //? Build plan
    const plan = this.plan(need, thread)

    //? Execute plan
    const folders = Object.keys(plan)
    for (const folder of folders) {
      const janitor = await this.custodian.get(folder)

      const lookup: Record<string | number, MessageModel> = {}
      const uids = plan[folder].map(({ uid, message }) => {
        lookup[uid] = message
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

      const emails = await do_in_batch(raw_emails, this.AI_BATCH_SIZE, janitor.full)
      await Promise.all(emails.map(async email => {
        const message = lookup[email.M.envelope.uid]
        if (!message) return this.Log.error("Something went wrong in populating the lookup table.")
        const resolved = resolve<EmailFull>(email, message)
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

    return have.sort((a, b) => b.M.envelope.date.valueOf() - a.M.envelope.date.valueOf())
  }

  async content(TID: string): Promise<Resolved<EmailFull>[] | null> {
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

    const have: Resolved<EmailFull>[] = []
    const need: MessageModel[] = []
    await Promise.all(messages.map(async message => {
      const email = await this.pantheon.cache.content.check(message.mid) || null
      if (!email) {
        need.push(message)
        return
      }
      email.M.flags.seen = message.seen
      email.M.flags.starred = message.starred
      const resolved = resolve<EmailFull>(email, message)
      have.push(resolved)
    }))

    //? Build plan
    const plan = this.plan(need, thread)

    //? Execute plan, using attachment level fetching anyways
    const folders = Object.keys(plan)
    for (const folder of folders) {
      const janitor = await this.custodian.get(folder)

      const lookup: Record<string | number, MessageModel> = {}
      const uids = plan[folder].map(({ uid, message }) => {
        lookup[uid] = message
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

      const emails = await do_in_batch(raw_emails, this.AI_BATCH_SIZE, janitor.full)
      await Promise.all(emails.map(async email => {
        const message = lookup[email.M.envelope.uid]
        if (!message) return this.Log.error("Something went wrong in populating the lookup table.")
        const resolved = resolve<EmailFull>(email, message)
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

    return have.sort((a, b) => b.M.envelope.date.valueOf() - a.M.envelope.date.valueOf())
  }

  async headers(TID: string): Promise<Resolved<EmailWithReferences>[] | null> {
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

    const have: Resolved<EmailWithReferences>[] = []
    const need: MessageModel[] = []
    await Promise.all(messages.map(async message => {
      const email = await this.pantheon.cache.headers.check(message.mid) || null
      if (!email) {
        need.push(message)
        return
      }
      email.M.flags.seen = message.seen
      email.M.flags.starred = message.starred
      const resolved = resolve<EmailWithReferences>(email, message)
      have.push(resolved)
    }))

    //? Build plan
    const plan = this.plan(need, thread)

    //? Execute plan
    const folders = Object.keys(plan)
    for (const folder of folders) {
      const janitor = await this.custodian.get(folder)

      const lookup: Record<string | number, MessageModel> = {}
      const uids = plan[folder].map(({ uid, message }) => {
        lookup[uid] = message
        return uid
      })

      const raw_emails = await this.courier.messages.listMessagesWithHeaders(folder, sequence(uids), {
        parse: true,
        markAsSeen: false,
        limit: uids.length
      })

      const emails = await do_in_batch(raw_emails, this.AI_BATCH_SIZE, janitor.headers)
      await Promise.all(emails.map(async email => {
        const message = lookup[email.M.envelope.uid]
        if (!message) return this.Log.error("Something went wrong in populating the lookup table.")
        const resolved = resolve<EmailWithReferences>(email, message)
        have.push(resolved)
        email = JSON.parse(JSON.stringify(email))
        const MID = message.mid
        await this.pantheon.cache.headers.cache(MID, email)
        await this.pantheon.cache.envelope.cache(MID, email)
      }))

    }

    return have.sort((a, b) => b.M.envelope.date.valueOf() - a.M.envelope.date.valueOf())
  }

}

class MultiThreadResolver {

  private readonly Log: Logger
  private readonly pantheon: PantheonProxy
  private readonly custodian: Custodian
  private readonly courier: PostOfficeProxy
  private readonly folders: Folders

  constructor(Registry: Register, private readonly AI_BATCH_SIZE: number) {
    const Lumberjack = Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Resolver/MultiThread')
    this.pantheon = Registry.get('Pantheon') as PantheonProxy
    this.custodian = Registry.get('Custodian') as Custodian
    this.courier = Registry.get('Courier') as PostOfficeProxy
    this.folders = Registry.get('Folders') as Folders
    autoBind(this)
  }

  plan(need: MessageModel[], threads: ThreadModel[]): FetchPlan {
    const plan: FetchPlan = {}

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
      if (loc) { plot(loc, message); continue; }

      //? Next, look for a shortcut
      loc = message.locations.filter(({ folder }) => !!(plan[folder]))?.[0]
      if (loc) { plot(loc, message); continue; }

      //? Then, try the inbox
      loc = getLocation(message.locations, this.folders.inbox() || '')
      if (loc) { plot(loc, message); continue; }

      //? Lastly, try the sent folder
      loc = getLocation(message.locations, this.folders.sent() || '')
      if (loc) { plot(loc, message); continue; }

      //? If all else fails just add the first folder
      loc = message.locations[0]
      if (loc) { plot(loc, message); continue; }
    }
    return plan
  }

  async latest(folder: string, minCursor: number, limit=5000): Promise<ResolvedThread<EmailFull>[] | null> {
    const _threads = await this.pantheon.db.threads.find.latest(folder, { limit })
    if (!_threads) {
      this.Log.error(folder.blue, "| threads do not exist in our database.")
      return null
    }
    const threads = _threads.filter(({ cursor }) => cursor > minCursor)

    const messages: MessageModel[] = []
    for (const thread of threads) {
      const msgs = await this.pantheon.db.threads.messages(thread.tid)
      if (!msgs || msgs.length == 0) {
        this.Log.warn("TID", thread.tid, "does not have messages?")
        continue;
      }
      //! we only push the latest 3 messages as that's all we're concerned with
      messages.push(...(msgs.slice(0, 3)))
    }
    if (messages.length == 0) {
      this.Log.warn("Latest TIDs do not have messages?")
      return null
    }

    const have: Resolved<EmailFull>[] = []
    const need: MessageModel[] = []
    await Promise.all(messages.map(async message => {
      const email = await this.pantheon.cache.content.check(message.mid) || null
      if (!email) {
        need.push(message)
        return
      }
      email.M.flags.seen = message.seen
      email.M.flags.starred = message.starred
      const resolved = resolve<EmailFull>(email, message)
      have.push(resolved)
    }))

    //? Build plan
    const plan = this.plan(need, threads)

    //? Execute plan
    const folders = Object.keys(plan)
    for (const folder of folders) {
      const janitor = await this.custodian.get(folder)

      const lookup: Record<string | number, MessageModel> = {}
      const uids = plan[folder].map(({ uid, message }) => {
        lookup[uid] = message
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

      const emails = await do_in_batch(raw_emails, this.AI_BATCH_SIZE, janitor.full)
      await Promise.all(emails.map(async email => {
        const message = lookup[email.M.envelope.uid]
        if (!message) return this.Log.error("Something went wrong in populating the lookup table.")
        const resolved = resolve<EmailFull>(email, message)
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

    const resolved: ResolvedThread<EmailFull>[] = resolveThreads<EmailFull>(have, threads)
    return resolved
  }

}