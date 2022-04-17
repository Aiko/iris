import crypto from 'crypto'
import fs2 from 'fs-extra'
import path from 'path'
import Datastore from 'nedb'
import Storage from '../utils/storage'
import Forest, { Logger, LumberjackEmployer } from '../utils/logger'
import { CacheLevels, EmailBase, EmailFull, EmailParticipant, EmailParticipantModel, EmailWithEnvelope, EmailWithReferences, MouseionAttachment, MouseionParsed } from '../utils/types'
import autoBind from 'auto-bind'

interface CacheBinding<T> {
  cache: (key: string, data: T) => Promise<void>
  check: (key: string) => Promise<T | false>
}

interface MouseionParsedWithEmbeddedAttachment extends Omit<MouseionParsed, "attachments"> {
  attachments: string[]
}

interface EmailFullWithEmbeddedAttachment extends Omit<EmailFull, "parsed"> {
  parsed: MouseionParsedWithEmbeddedAttachment
}
const isEmailFullWithEmbeddedAttachment = (email: any):email is EmailFullWithEmbeddedAttachment =>
!!(email?.parsed?.attachments?.length > -1);;

interface EmbeddedMouseionAttachment extends MouseionAttachment {
  author: EmailParticipant
  date: Date
}

export class Cache {
  readonly dir: string
  readonly db: DB
  readonly paths: Record<CacheLevels, string>
  readonly caches: Record<CacheLevels, Storage>
  readonly Log: Logger

  private path(part: string) {
    return path.join(this.dir, part)
  }

  private storage(level: CacheLevels) {
    return new Storage(this.paths[level])
  }

  envelope: CacheBinding<EmailWithEnvelope>
  headers: CacheBinding<EmailWithReferences>
  content: CacheBinding<EmailFull>

  constructor(dir: string, db: DB, l: Logger) {
    this.dir = dir
    this.dir = this.path('cache')
    this.Log = l

    this.db = db

    process.title = "Mouseion - Pantheon: " + this.dir

    this.paths = {
      L1: this.path('L1'),
      L2: this.path('L2'),
      L3: this.path('L3'),
      L3b: this.path('L3b'),
      ATT: this.path('ATT')
    }

    this.caches = {
      L1: this.storage("L1"),
      L2: this.storage("L2"),
      L3: this.storage("L3"),
      L3b: this.storage("L3b"),
      ATT: new Storage(this.paths["ATT"], {json: false, raw: true})
    }

    //? we need to promisify methods as SP only uses promises
    const cachify = <T extends EmailBase>(fn: Storage, canonical_level: CacheLevels): CacheBinding<T> => {
      return {
        cache: (key: string, value: T) => {
          value.cache_location = canonical_level
          return fn.cache(key, value)
        },
        check: (key: string): Promise<T | false> => fn.check(key)
      }
    }

    this.envelope = cachify<EmailWithEnvelope>(this.caches.L1, "L1")
    this.headers = cachify<EmailWithReferences>(this.caches.L2, "L2")
    this.content = cachify<EmailFull>(this.caches.L3b, "L3b")

    autoBind(this)
  }

  private async fullCache(mid: string, email: EmailFull): Promise<void> {
    try {
      const promises: Promise<any>[] = []
      const _this = this
      const attachments: string[] = await Promise.all(email.parsed.attachments.map(
        (attachment: MouseionAttachment): EmbeddedMouseionAttachment => {
          const author = email.M.envelope.from
          return {
            ...attachment,
            date: new Date(),
            author
          }
        }
      ).map(async attachment => {
        //? Cache files
        const filepath = await (async () => {
          try {
            const ext = path.extname(attachment.filename)
            const direct_path = Storage.clean_key(email.M.envelope.mid) + "/" + attachment.filename.slice(-86)
            const indirect_path = Storage.clean_key(email.M.envelope.mid).substring(0, 86) + "/" + (attachment.checksum || "NOCHECKSUMNOFILENAME").substring(0, 86) + '.' + ext
            const exists = attachment.filename ? (await this.caches.ATT.has_key(direct_path)) : false
            return exists ? indirect_path : direct_path
          } catch (e) {
            if (e instanceof Error) {
              _this.Log.error(e.message, e.stack)
            } else if (typeof e === "string") {
              _this.Log.error(e)
            } else _this.Log.error(e)
            return "brokenpipe"
          }
        })()

        promises.push(this.caches.ATT.cache(filepath, attachment.content.data).catch(e => _this.Log.error("wtf?", filepath, e)))

        //? Save to DB
        promises.push(Attachment.fromEmbeddedMouseionAttachment(this.db, attachment, filepath, this.caches.ATT.dir))

        return filepath
      }))
      const cidEmail: EmailFullWithEmbeddedAttachment = ((): EmailFullWithEmbeddedAttachment => {
        return {...email, parsed: { ...email.parsed, attachments }}
      })()

      cidEmail.cache_location = "L3"

      promises.push(this.caches.L3.cache(mid, cidEmail))
      await Promise.all(promises)
    } catch (e) {
      if (e instanceof Error) {
        this.Log.error(e.message, e.stack)
      } else if (typeof e === "string") {
        this.Log.error(e)
      } else this.Log.error(e)
    }
  }
  private async fullCheck(mid: string): Promise<EmailFull | null> {
    const cidEmail: EmailFullWithEmbeddedAttachment = await this.caches.L3.check(mid)
    if (!isEmailFullWithEmbeddedAttachment(cidEmail)) return null;
    const fps = cidEmail.parsed.attachments
    const attachments: EmbeddedMouseionAttachment[] = (await Promise.all(fps.map(
      (fp: string) => Attachment.fromFilepath(this.db, fp)
    ))).map(att => isDBError(att) ? null : att.clean())
      .filter(_ => _ as AttachmentModel)
      .map(att => ({...att, content: { data: Buffer.from([]), type: ""}})) as EmbeddedMouseionAttachment[]
    return {...cidEmail, parsed: {...cidEmail.parsed, attachments}}
  }
  full = {
    cache: this.fullCache.bind(this),
    check: this.fullCheck.bind(this)
  }

}

type DBModels = "Message" | "Thread" | "Contact" | "Attachment"

interface DBError {
  error: string,
  dne?: boolean
}
export const isDBError = (x: any):x is DBError => !!(x.error)

enum DBState {
  OK,
  New,
  Corrupt
}


const clone = (m: EmailParticipant): EmailParticipantModel => ({
  name: m.name,
  address: m.address,
  base: m.base
});
const cloneN = (ms: EmailParticipant[]) => ms.map(clone);;

export class DB {
  readonly dir: string
  readonly Log: Logger
  readonly stores: Record<DBModels, Datastore>
  private cursor: number
  user: string

  private path(part: string) {
    return path.join(this.dir, part)
  }

  nextCursor() {
    this.cursor++
    return this.cursor
  }

  prevCursor() {
    this.cursor--
    return this.cursor
  }

  getCursor() {
    return this.cursor
  }

  constructor(dir: string, cursor: number, user: string, l: Logger) {
    this.cursor = cursor
    this.dir = dir
    this.dir = this.path("db")
    this.user = user
    this.Log = l
    this.stores = {
      Message: new Datastore({
        filename: this.path("Message"),
        autoload: true,
        timestampData: true
      }),
      Thread: new Datastore({
        filename: this.path("Thread"),
        autoload: true,
        timestampData: true
      }),
      Contact: new Datastore({
        filename: this.path("Contact"),
        autoload: true,
        timestampData: true
      }),
      Attachment: new Datastore({
        filename: this.path("Attachment"),
        autoload: true,
        timestampData: true
      })
    }
    autoBind(this)
  }

  //*-------------- Utility methods for messages
  async findMessageWithMID(mid: string): Promise<MessageModel | null> {
    const message = await Message.fromMID(this, mid)
    if (isDBError(message)) {
      if (!(message.dne)) this.Log.error(message.error)
      return null
    }
    return message.clean()
  }
  async findMessagesInFolder(folder: string, {limit=5000} ={}): Promise<MessageModel[] | null> {
    const messages = await Message.fromFolder(this, folder, {limit})
    if (isDBError(messages)) {
      this.Log.error(messages.error)
      return null
    }
    return messages.map(m => m.clean())
  }
  async findMessageWithUID(folder: string, uid: string | number): Promise<MessageModel | null> {
    const location: MessageLocation = { folder, uid }
    const message = await Message.fromLocation(this, location)
    if (isDBError(message)) {
      if (!(message.dne)) this.Log.error(message.error)
      return null
    }
    return message.clean()
  }
  async findMessagesWithSubject(subject: string, {limit=5000} ={}): Promise<MessageModel[] | null> {
    const messages = await Message.fromSubject(this, subject, {limit})
    if (isDBError(messages)) {
      this.Log.error(messages.error)
      return null
    }
    return messages.map(m => m.clean())
  }
  //! You have to provide everything when using overwrite
  async addMessage(m: MessageModel, {
    overwrite=false
  } ={}) {
    //? Check if it exists
    let message = await Message.fromMID(this, m.mid)
    if (isDBError(message)) {
      if (message.dne) {
        //? The message doesn't exist and we add it from scratch

        message = new Message(this, m)
        if (isDBError(await message.save())) return false
        else return true

      } else return false
    } else {
      //? The message exists and we may need to simply update
      //! Note that although new locations will always be added,
      //! no other changes will occur without overwrite=true

      for (const location of (m.locations)) {
        message.addLocation(location, {overwrite,})
      }

      if (overwrite) {
        if (message.tid != m.tid) {
          message.tid = m.tid
          message.audit_log.push("changed thread to " + m.tid)
        }
        if (message.seen != m.seen) {
          message.seen = m.seen
          message.audit_log.push("changed seen status to " + m.seen)
        }
        if (message.starred != m.starred) {
          message.starred = m.starred
          message.audit_log.push("changed starred status to " + m.starred)
        }
      }

      const saved = await message.save()
      await message.calibrateThread()

      if (isDBError(saved)) return false
      else return true

    }
  }
  /**
   * Please do not use this to MOVE emails (aka changing location).
   * Rather, instead remove the location first and
   * then use addMessage to add a new location.
  */
  async updateMessage(mid: string, {
    tid, seen=null, starred=null
  }: {
    tid: string | null,
    seen: boolean | null,
    starred: boolean | null
  }): Promise<boolean> {
    const message = await Message.fromMID(this, mid)
    if (isDBError(message)) return false

    if (seen != null && message.seen != seen) {
      message.seen = seen
      message.audit_log.push("changed seen status to " + seen)
    }
    if (starred != null && message.starred != starred) {
      message.starred = starred
      message.audit_log.push("changed starred status to " + starred)
    }
    if (tid != null) {
      const changed = await message.changeThread(tid)
      if (!changed) return false
    }

    const saved = await message.save()
    if (isDBError(saved)) return false
    return true
  }
  async removeMessage(mid: string): Promise<boolean> {
    const message = await Message.fromMID(this, mid)
    if (isDBError(message)) {
      this.Log.error(message.error)
      return false
    }
    message.audit_log.push("removing message (direct call)")
    return await message.purge()
  }
  async removeMessageLocation(folder: string, uid: string | number, {
    purgeIfEmpty=true
  } ={}): Promise<boolean> {
    const message = await Message.fromLocation(this, {folder, uid})
    if (isDBError(message)) {
      this.Log.error(message.error)
      return false
    }
    return await message.removeLocation({folder, uid}, {purgeIfEmpty})
  }
  async messageAuditLog(mid: string, log: string): Promise<string[]> {
    //? add to message audit log and save
    const message = await Message.fromMID(this, mid)
    if (isDBError(message)) {
      this.Log.error(message.error)
      return []
    }
    message.audit_log.push(log)
    const saved = await message.save()
    if (isDBError(saved)) {
      this.Log.error(saved.error)
      return message.audit_log
    }
    return message.audit_log
  }

  //*-------------- Utility methods for threads
  async findThreadWithTID(tid: string): Promise<ThreadModel | null> {
    const thread = await Thread.fromTID(this, tid)
    if (isDBError(thread)) {
      if (!(thread.dne)) this.Log.error(thread.error)
      return null
    }
    return thread.clean()
  }
  async findThreadsInFolder(folder: string, {limit=5000} ={}): Promise<ThreadModel[] | null> {
    const threads = await Thread.fromFolder(this, folder, {limit})
    if (isDBError(threads)) {
      this.Log.error(threads.error)
      return null
    }
    return threads.map(t => t.clean())
  }
  async findThreadsByLatest(folder: string, {limit=5000, start=0, loose=false} ={}): Promise<ThreadModel[] | null> {
    const threads = await Thread.fromLatest(this, folder, {limit, start, loose})
    if (isDBError(threads)) {
      this.Log.error(threads.error)
      return null
    }
    return threads.map(t => t.clean())
  }
  async mergeThreads(eul: string, gap: string): Promise<boolean> {
    return await Thread.merge(this, eul, gap)
  }
  async threadMessages(tid: string, {
    descending=true
  } ={}): Promise<MessageModel[]> {
    const thread = await Thread.fromTID(this, tid)
    if (isDBError(thread)) {
      if (!(thread.dne)) this.Log.error(thread.error)
      return []
    }
    const messages = await thread.messages({descending})
    return messages.map(message => message.clean())
  }
  async threadAuditLog(tid: string, log: string): Promise<string[]> {
    //? add to thread audit log and save
    const thread = await Thread.fromTID(this, tid)
    if (isDBError(thread)) {
      this.Log.error(thread.error)
      return []
    }
    thread.audit_log.push(log)
    const saved = await thread.save()
    if (isDBError(saved)) {
      this.Log.error(saved.error)
      return thread.audit_log
    }
    return thread.audit_log
  }

  //*-------------- Utility methods for contacts
  async findContacts(searchTerm: string): Promise<ContactModel[] | null> {
    const contacts = await Contact.search(this, searchTerm)
    if (isDBError(contacts)) {
      this.Log.error(contacts.error)
      return null
    }
    return contacts.map(c => c.clean())
  }
  async updateContactReceived(email: string, name: string): Promise<boolean> {
    const contact = await Contact.fromReceived(this, email, name)
    if (isDBError(contact)) {
      this.Log.error(contact.error)
      return false
    }
    return true
  }
  async updateContactSent(email: string, name: string): Promise<boolean> {
    const contact = await Contact.fromSent(this, email, name)
    if (isDBError(contact)) {
      this.Log.error(contact.error)
      return false
    }
    return true
  }

  //*-------------- Utility methods for attachments
  async findAttachments(searchTerm: string): Promise<AttachmentModel[] | null> {
    this.Log.log("Searching for attachments matching:", searchTerm)
    const attachments = await Attachment.search(this, searchTerm)
    if (isDBError(attachments)) {
      this.Log.error(attachments.error)
      return null
    }
    this.Log.log("Found", attachments.length, "matching attachments.")
    return attachments.map(a => a.clean())
  }

}

export type MessageLocation = {
  folder: string,
  uid: string | number
}
export const sameLocation = (L1: MessageLocation, L2: MessageLocation): boolean => {
  return (L1.folder == L2.folder && L1.uid == L2.uid)
}
//! This is defined here so you can use it in synchronous contexts
export const getLocation = (locations: MessageLocation[], folder: string): MessageLocation | null => {
  const matches = locations.filter(L => L.folder == folder)
  if (matches.length == 0) return null
  return matches?.[0]
}

export interface MessageModel {
  mid: string
  tid: string
  seen: boolean
  starred: boolean
  subject: string
  from: EmailParticipantModel
  to: EmailParticipantModel[]
  cc: EmailParticipantModel[]
  bcc: EmailParticipantModel[]
  recipients: EmailParticipantModel[]
  timestamp: Date
  locations: MessageLocation[]
  audit_log: string[]
}

class Message implements MessageModel {
  readonly db: DB
  readonly ds: Datastore

  readonly mid: string
  tid: string
  seen: boolean
  starred: boolean
  subject: string
  timestamp: Date
  locations: MessageLocation[]
  from: EmailParticipantModel
  to: EmailParticipantModel[]
  cc: EmailParticipantModel[]
  bcc: EmailParticipantModel[]
  recipients: EmailParticipantModel[]
  audit_log: string[]

  private state: DBState = DBState.New

  //? Call with tid: '' then immediately save to create a thread
  constructor(db: DB, data: MessageModel) {
    this.db = db
    this.ds = this.db.stores.Message

    this.mid = data.mid
    this.tid = data.tid
    this.seen = data.seen
    this.starred = data.starred
    this.subject = data.subject
    this.timestamp = new Date(data.timestamp)
    this.locations = data.locations
    this.from = clone(data.from)
    this.to = cloneN(data.to)
    this.cc = cloneN(data.cc)
    this.bcc = cloneN(data.bcc)
    this.recipients = cloneN(data.recipients)
    this.audit_log = data.audit_log
    autoBind(this)
  }

  /** Utility method to make life easier for the structured clone algorithm */
  clean(): MessageModel {
    return {
      mid: this.mid,
      tid: this.tid,
      seen: this.seen,
      starred: this.starred,
      subject: this.subject,
      timestamp: this.timestamp,
      from: this.from,
      to: this.to,
      cc: this.cc,
      bcc: this.bcc,
      recipients: this.recipients,
      locations: this.locations.map((m: MessageLocation) => {
        const { folder, uid } = m
        return { folder, uid }
      }),
      audit_log: this.audit_log
    }
  }

  /** Returns the "shadow," essentially what is in the DB */
  shadow(): Promise<MessageModel | DBError> {
    return new Promise((s, _) => {
      if (this.state == DBState.New) return s({
        error: "Tried to find the shadow for a Message that has yet to be saved."
      })
      this.ds.findOne({ mid: this.mid }, (err, doc: MessageModel) => {
        if (err || !doc) {
          this.state = DBState.Corrupt
          return s({
            error: "The shadow for the Message no longer exists. Message is in a corrupt state."
          })
        }
        this.state = DBState.OK
        doc.timestamp = new Date(doc.timestamp)
        return s(doc)
      })
    })
  }

  /** Resets to whatever is in DB */
  async reset() {
    const shadow = await this.shadow()
    if (isDBError(shadow)) throw new Error(shadow.error)
    if (this.state != DBState.OK) throw new Error(
      "Tried resetting a Message that " +
        (this.state == DBState.New) ? "does not exist." : "is corrupted."
    )
    const {
      tid, seen, starred, subject, timestamp, locations, from, to, cc, bcc, recipients
    } = shadow
    this.tid = tid
    this.seen = seen
    this.starred = starred
    this.subject = subject
    this.timestamp = timestamp
    this.locations = locations
    this.from = from
    this.to = to
    this.cc = cc
    this.bcc = bcc
    this.recipients = recipients
  }

  save({force=false} ={}): Promise<MessageModel | DBError> {
    return new Promise(async (s, _) => {
      const shadow = await this.shadow()
      if (this.state == DBState.New || (force && this.state == DBState.Corrupt)) {
        if (this.tid.length == 0) {
          const t = new Thread(this.db, {
            tid: this.tid,
            mids: [],
            date: this.timestamp,
            cursor: this.db.getCursor(),
            folder: '',
            allFolders: [],
            participants: [],
            audit_log: ["created new thread with tid " + this.tid]
          })
          await t.save()
          this.tid = t.tid
        }
        this.ds.insert(this.clean(), async (err, doc: MessageModel) => {
          if (err || !doc) return s({
            error: err ? (err.message + err.stack) : "Failed to save new/corrupt Message."
          })
          this.state = DBState.OK

          //? Update the thread
          const t = await this.thread()
          if (isDBError(t)) return s(t)
          t.mids.push(this.mid)
          await t.calibrate()

          return s(doc)
        })
      } else {
        if (isDBError(shadow)) return s(shadow)

        this.ds.update({ mid: this.mid }, this.clean(), {}, async (err) => {
          if (err) return s({error: err.message + err.stack})

          const t = await this.thread()
          if (isDBError(t)) return s(t)
          if (!(t.mids.includes(this.mid))) {
            t.mids.push(this.mid)
            await t.calibrate()
          }

          return s(await this.shadow())
        })
      }
    })
  }

  purge(): Promise<boolean> {
    return new Promise(async (s, _) => {
      const shadow = await this.shadow()
      if (isDBError(shadow)) return s(false)

      const t = await this.thread()
      if (isDBError(t)) return s(false)

      if (!(t.removeMessage(this.mid))) return s(false)

      this.ds.remove({ mid: this.mid }, {}, (err) => {
        if (err) return s(false)

        this.state = DBState.Corrupt
        return s(true)
      })
    })
  }

  //? Utility methods to help with dealing with threads
  async thread(): Promise<Thread | DBError> {
    return await Thread.fromTID(this.db, this.tid)
  }
  async calibrateThread({
    save=true,
    updateCursor=true
  } ={}) {
    const t = await this.thread()
    if (isDBError(t)) {}
    else {
      await t.calibrate({save, updateCursor})
    }
  }
  async changeThread(tid: string): Promise<boolean> {
    if (tid == this.tid) return true

    const t1 = await this.thread()
    if (isDBError(t1)) return false
    if (!(t1.removeMessage(this.mid))) return false

    this.tid = tid
    this.audit_log.push("changed parent thread to " + tid)
    const m2 = await this.save()
    if (isDBError(m2)) return false

    return true
  }

  //? Utility methods to help with dealing with locations
  //! Note everything will implode if you forcibly add two locations in the same folder
  getLocation(f: string):MessageLocation | null {
    return this.locations.filter(({ folder }) => f == folder)?.[0]
  }
  isInFolder(f: string):boolean {
    return !!(this.getLocation(f))
  }
  async addLocation(m: MessageLocation, {overwrite=false} ={}) {
    if (this.isInFolder(m.folder)) {
      if (overwrite) {
        this.locations = this.locations.map(L => {
          if (L.folder == m.folder) L.uid = m.uid
          return L
        })
        this.audit_log.push("overwrote location for " + m.folder + " with " + m.uid)
      }
    } else {
      this.locations.push(m)
      this.audit_log.push("added location for " + m.folder + " with " + m.uid)
    }
    return this.save()
  }
  //! purges messages when no locations are left by default
  //? override this behaviour by passing purgeIfEmpty: false
  async removeLocation(m: MessageLocation, {
    purgeIfEmpty=true
  } ={}): Promise<boolean> {
    const location = this.getLocation(m.folder)
    if (!location) return false
    if (!(location.uid == m.uid)) return false
    this.locations = this.locations.filter(L => !sameLocation(L, m))
    this.audit_log.push("removed location for " + m.folder + " with " + m.uid)
    if (purgeIfEmpty && this.locations.length == 0) return await this.purge()
    if (isDBError(await this.save())) return false
    await this.calibrateThread()
    return true
  }

  static fromMID(db: DB, mid: string): Promise<Message | DBError> {
    return new Promise((s, _) => {
      const ds = db.stores.Message
      ds.findOne({ mid, }, (err, doc: MessageModel) => {
        if (err || !doc) {
          return s({
            error: err?.message || "A message with that MID does not exist.",
            dne: !err
          })
        }
        const m = new Message(db, doc)
        m.state = DBState.OK
        return s(m)
      })
    })
  }

  static fromFolder(db: DB, folder: string, {limit=5000} ={}): Promise<Message[] | DBError> {
    return new Promise((s, _) => {
      const ds = db.stores.Message
      ds.find({ locations: {
        $elemMatch: { folder, }
      }}).limit(limit).exec((err, docs: MessageModel[]) => {
        if (err || !docs) {
          return s({
            error: err?.message || "Couldn't find Messages in that folder."
          })
        }
        const messages = docs.map(doc => {
          const m = new Message(db, doc)
          m.state = DBState.OK
          return m
        })
        return s(messages)
      })
    })
  }

  static fromLocation(db: DB, {folder, uid}: MessageLocation): Promise<Message | DBError> {
    return new Promise((s, _) => {
      const ds = db.stores.Message
      ds.findOne({ locations: {
        $elemMatch: { folder, uid }
      } }, (err, doc: MessageModel) => {
        if (err || !doc) {
          return s({
            error: err?.message ?? "A message with that location does not exist.",
            dne: !err
          })
        }
        const m = new Message(db, doc)
        m.state = DBState.OK
        return s(m)
      })
    })
  }

  static fromSubject(db: DB, subject: string, {limit=5000} ={}): Promise<Message[] | DBError> {
    return new Promise((s, _) => {
      const ds = db.stores.Message
      ds.find({ subject, }).limit(limit).exec((err, docs: MessageModel[]) => {
        if (err || !docs) {
          return s({
            error: err?.message || "Couldn't find Messages with that subject."
          })
        }
        const messages = docs.map(doc => {
          const m = new Message(db, doc)
          m.state = DBState.OK
          return m
        })
        return s(messages)
      })
    })
  }

}

export interface ThreadModel {
  mids: string[],
  date: Date
  cursor: number //? similar to "last modified"
  //! ^ as long as sync interval > 3s it'll take 20+ years for this to be outdated
  folder: string //? core folder for thread
  allFolders: string[] //? other folders for thread
  tid: string
  participants: EmailParticipantModel[]
  audit_log: string[]
}

class Thread implements ThreadModel {
  readonly db: DB
  readonly ds: Datastore

  mids: string[]
  date: Date
  cursor: number = 0
  folder: string
  allFolders: string[]
  tid: string
  participants: EmailParticipantModel[]
  audit_log: string[]

  private state: DBState = DBState.New

  TID(): Promise<string> {
    return new Promise(async (s, _) => {
      const tid = crypto.randomBytes(6).toString('hex')
      this.ds.findOne({ tid, }, async (err, doc: ThreadModel) => {
        if (!doc || isDBError(err)) s(tid)
        else s(await this.TID())
      })
    })
  }

  //? Call with tid: '' and then immediately call save to auto-generate a TID
  constructor(db: DB, data: ThreadModel) {
    this.db = db
    this.ds = this.db.stores.Thread

    this.mids = data.mids
    this.date = new Date(data.date)
    this.cursor = data.cursor
    this.folder = data.folder
    this.allFolders = data.allFolders
    this.tid = data.tid
    this.participants = cloneN(data.participants)
    this.audit_log = data.audit_log
    autoBind(this)
  }

  /** Utility method to make life easier for the structured clone algorithm */
  clean(): ThreadModel {
    return {
      mids: this.mids.map((mid: string) => mid),
      date: this.date,
      cursor: this.cursor,
      folder: this.folder,
      allFolders: this.allFolders,
      tid: this.tid,
      participants: cloneN(this.participants),
      audit_log: this.audit_log
    }
  }

  /** Returns the "shadow," essentially what is in the DB */
  shadow(): Promise<ThreadModel | DBError> {
    return new Promise((s, _) => {
      if (this.state == DBState.New) return s({
        error: "Tried to find the shadow for a Thread that has yet to be saved."
      })
      this.ds.findOne({ tid: this.tid }, (err, doc: ThreadModel) => {
        if (err || !doc) {
          this.state = DBState.Corrupt
          return s({
            error: "The shadow for the Thread no longer exists. Message is in a corrupt state."
          })
        }
        this.state = DBState.OK
        doc.date = new Date(doc.date)
        return s(doc)
      })
    })
  }

  /** Resets to whatever is in DB */
  async reset() {
    const shadow = await this.shadow()
    if (isDBError(shadow)) throw new Error(shadow.error)
    if (this.state != DBState.OK) throw new Error(
      "Tried resetting a Thread that " +
        (this.state == DBState.New) ? "does not exist." : "is corrupted."
    )
    const {
      mids, date, cursor, folder, allFolders
    } = shadow

    this.mids = mids.map(_ => _)
    this.date = date
    this.cursor = cursor
    this.folder = folder
    this.allFolders = allFolders
  }

  save({force=false} ={}): Promise<ThreadModel | DBError> {
    return new Promise(async (s, _) => {
      if (this.tid.length < 1) {
        this.tid = await this.TID()
        this.state = DBState.New
      }
      const shadow = await this.shadow()
      if (this.state == DBState.New || (force && this.state == DBState.Corrupt)) {
        this.ds.insert(this.clean(), (err, doc: ThreadModel) => {
          if (err || !doc) return s({
            error: err ? (err.message + err.stack) : "Failed to save new/corrupt Thread."
          })
          this.state = DBState.OK
          return s(doc)
        })
      } else {
        if (isDBError(shadow)) return s(shadow)
        this.ds.update({ tid: this.tid }, this.clean(), {}, async (err) => {
          if (err) return s({error: err.message + err.stack})

          return s(await this.shadow())
        })
      }
    })
  }

  /** Calibrates the date & folder & participants of the thread (or deletes it from DB if it has no MIDs) */
  async calibrate({
    save=true,
    updateCursor=true
  } ={}) {
    const messages = await this.messages()
    if (messages.length == 0) {
      if (save) {
        this.audit_log.push("deleted thread because it has no messages")
        this.ds.remove({ tid: this.tid }, {}, (err) => {
          if (err) this.db.Log.error(err)
        })
      }
      return
    }

    //? set the date to the newest date (first message)
    const date = messages[0].timestamp
    if (this.date != date) {
      this.date = date
      this.audit_log.push("changed date to " + date.toISOString())
    }

    //? determine the UI board a thread belongs to
    let board = ''
    let fallback = ''
    for (const message of messages) {
      const folders = message.locations.map(({ folder }) => folder)
      const boards = folders.filter(folder => folder.startsWith('[Aiko]'))

      //? Boards take precedence
      if (boards.length > 0) {
        board = boards.reduceRight(_ => _)
        break;
      }

      //? INBOX can be used as fallback
      if (folders.includes("INBOX")) {
        fallback = "INBOX"
        //! The logic behind breaking here is simple
        //! If the newest email in a thread is not in a board
        //! and is also in the inbox, then the thread no longer
        //! belongs to the board but to the inbox instead
        //! i.e. if the mailserver did not automatically move the email, move the thread
        //! in this way we can leave default behavior to the mailserver
        break;
      }

    }

    if (!board) board = fallback

    //? if folder is still empty string after this,
    //? means don't show it in the inbox UI
    this.folder = board

    const allFolders =
      [...new Set(messages.map(({ locations }) => locations.map(({ folder }) => folder)).flat())]
    ;
    allFolders.map(folder => {
      if (!this.allFolders.includes(folder)) {
        this.allFolders.push(folder)
        this.audit_log.push("added folder " + folder)
      }
    })
    this.allFolders.map(folder => {
      if (!allFolders.includes(folder)) {
        this.allFolders.splice(this.allFolders.indexOf(folder), 1)
        this.audit_log.push("removed folder " + folder)
      }
    })

    await this.getParticipants(messages)

    if (updateCursor) this.cursor = this.db.getCursor()

    if (save) await this.save()
  }

  private async getParticipants(messages: MessageModel[]) {
    const _this = this
    const participantAddresses = new Set()
    const participants = messages.map(({ from, recipients, locations }): EmailParticipantModel[] => {
      const people = [from, ...recipients]
      //? try to detect a forwarding address
      const forwardAddress = ((): string | null => {
        //? if we weren't the sender
        if (_this.db.user != from.address) return null;
        //? ok but if we WERE the sender
        //! FIXME: this is a HORRIBLE way to check if its the sent folder
        if (locations.filter(({ folder }) => folder.includes('Sent')).length > 0) return from.address
        //? if we weren't a recipient
        const _recipients = recipients.map(({ address }) => address)
        if (_recipients.includes(_this.db.user)) return null
        //! does not check the "received" headerline
        return null
      })()
      const others = people.filter(({ address }) =>
        (address != _this.db.user) &&
        (address != forwardAddress) &&
        !(participantAddresses.has(address))
      )
      others.map(({ address }) => participantAddresses.add(address))
      return others
    }).flat()
    participants.map(participant => {
      const exists = this.participants.find(({ address }) => address == participant.address)
      if (!exists) {
        this.participants.push(participant)
        this.audit_log.push("added participant " + participant.address + " with name " + participant.name)
      } else {
        const i = this.participants.indexOf(exists)
        if (exists.name != participant.name) {
          exists.name = participant.name
          this.audit_log.push("changed participant name for " + participant.address + " to " + participant.name)
        }
        if (exists.base != participant.base) {
          exists.base = participant.base
          this.audit_log.push("changed participant base name for " + participant.address + " to " + participant.base)
        }
        // update element in array
        this.participants[i] = exists
      }
    })
    this.participants.map(participant => {
      const exists = participants.find(({ address }) => address == participant.address)
      if (!exists) {
        this.participants.splice(this.participants.indexOf(participant), 1)
        this.audit_log.push("removed participant " + participant.address)
      }
    })
  }

  //? Utility methods to work with messages
  hasMID(mid: string): boolean {
    return this.mids.includes(mid)
  }
  async messages({descending=true} ={}): Promise<Message[]> {
    const maybeMessages = await Promise.all(
      this.mids.map(async (mid: string) => {
        const message = await Message.fromMID(this.db, mid)
        if (isDBError(message)) return null
        return message
      })
    )
    //! we have to typecast the below as typescript does not understand != null
    const messages = maybeMessages.filter((msg: Message | null) => msg != null) as Message[]
    //? sort by date
    if (descending) messages.sort((m1, m2) => m2.timestamp.valueOf() - m1.timestamp.valueOf())
    else messages.sort((m1, m2) => m1.timestamp.valueOf() - m2.timestamp.valueOf())
    return messages
  }
  async removeMessage(mid: string): Promise<boolean> {
    if (!this.hasMID(mid)) return false
    this.mids = this.mids.filter(m => m != mid)
    this.audit_log.push("removed message " + mid)
    await this.calibrate()
    return true
  }

  static fromTID(db: DB, tid: string): Promise<Thread | DBError> {
    return new Promise((s, _) => {
      const ds = db.stores.Thread
      ds.findOne({ tid, }, (err, doc: ThreadModel) => {
        if (err || !doc) {
          return s({
            error: err?.message || "A thread with that TID does not exist.",
            dne: !err
          })
        }
        const t = new Thread(db, doc)
        t.state = DBState.OK
        return s(t)
      })
    })
  }

  static fromFolder(db: DB, folder: string, {limit=5000} ={}): Promise<Thread[] | DBError> {
    return new Promise((s, _) => {
      const ds = db.stores.Thread
      ds.find({ folder, }).limit(limit).exec((err, docs: ThreadModel[]) => {
        if (err || !docs) {
          return s({
            error: err?.message || "Couldn't find Threads in that folder."
          })
        }
        const threads = docs.map(doc => {
          const t = new Thread(db, doc)
          t.state = DBState.OK
          return t
        })
        return s(threads)
      })
    })
  }

  static fromLatest(db: DB, folder: string, {limit=5000, start=0, loose=false} ={}): Promise<Thread[] | DBError> {
    return new Promise((s, _) => {
      const ds = db.stores.Thread
      const q = loose ? ds.find({ allFolders: folder }) : ds.find({ folder })
      q.sort({ date: -1 }).skip(start).limit(limit).exec((err, docs: ThreadModel[]) => {
        if (err || !docs) {
          return s({
            error: err?.message || "Couldn't find Threads in that folder."
          })
        }
        const threads = docs.map(doc => {
          const t = new Thread(db, doc)
          t.state = DBState.OK
          return t
        })
        return s(threads)
      })
    })
  }

  static async merge(db: DB, eulTID: string, gapTID: string): Promise<boolean> {
    const eul = await this.fromTID(db, eulTID)
    if (isDBError(eul)) return false

    const gap = await this.fromTID(db, gapTID)
    if (isDBError(gap)) return false

    const immigrants = eul.clean().mids
    eul.mids = []
    eul.audit_log.push("disowned all messages for merge")
    await eul.calibrate()

    //? grant visas
    const visa_holders = immigrants.filter(immigrant => !(gap.hasMID(immigrant)))
    visa_holders.map(mid => gap.mids.push(mid))
    gap.audit_log.push("added messages: " + visa_holders)
    await gap.calibrate()

    const results:(MessageModel | DBError)[] = await Promise.all(visa_holders.map(async mid => {
      const message = await Message.fromMID(db, mid)
      if (isDBError(message)) return message
      message.tid = gap.tid //? can't use .changeThread because eul is deleted
      message.audit_log.push("changed thread (MERGE) to " + gap.tid)
      return await message.save()
    }))

    for (const result of results) {
      if (isDBError(result)) db.Log.error(result.error)
    }

    return true
  }

}

export interface ContactModel {
  name: string
  email: string
  sent: number
  received: number
  lastSeen: Date
  priority: number
  audit_log: string[]
}

class Contact implements ContactModel {
  readonly db: DB
  readonly ds: Datastore

  readonly email: string
  name: string
  sent: number
  received: number
  lastSeen: Date
  priority: number
  audit_log: string[]

  private state: DBState = DBState.New

  //? Call with any prio then immediately save to calculate priority
  constructor(db: DB, data: ContactModel) {
    this.db = db
    this.ds = this.db.stores.Contact

    this.email = data.email
    this.name = data.name
    this.sent = data.sent
    this.received = data.received
    this.lastSeen = new Date(data.lastSeen)
    this.priority = data.priority
    this.audit_log = data.audit_log
    autoBind(this)
  }

  //? Algorithm to calculate priority value
  //! Does not save!
  score() {
    this.priority = this.received + (5*this.sent)
  }

  /** Utility method to make life easier for the structured clone algorithm */
  clean(): ContactModel {
    return {
      email: this.email,
      name: this.name,
      sent: this.sent,
      received: this.received,
      lastSeen: this.lastSeen,
      priority: this.priority,
      audit_log: this.audit_log
    }
  }

  /** Returns the "shadow," essentially what is in the DB */
  shadow(): Promise<ContactModel | DBError> {
    return new Promise((s, _) => {
      if (this.state == DBState.New) return s({
        error: "Tried to find the shadow for a Contact that has yet to be saved."
      })
      this.ds.findOne({ email: this.email }, (err, doc: ContactModel) => {
        if (err || !doc) {
          this.state = DBState.Corrupt
          return s({
            error: "The shadow for the Contact no longer exists. Contact is in a corrupt state."
          })
        }
        this.state = DBState.OK
        doc.lastSeen = new Date(doc.lastSeen)
        return s(doc)
      })
    })
  }

  /** Resets to whatever is in DB */
  async reset() {
    const shadow = await this.shadow()
    if (isDBError(shadow)) throw new Error(shadow.error)
    if (this.state != DBState.OK) throw new Error(
      "Tried resetting a Contact that " +
        (this.state == DBState.New) ? "does not exist." : "is corrupted."
    )
    const {
      name, sent, received, lastSeen, priority
    } = shadow
    this.name = name
    this.sent = sent
    this.received = received
    this.lastSeen = lastSeen
    this.priority = priority
  }

  save({force=false} ={}): Promise<ContactModel | DBError> {
    return new Promise(async (s, _) => {
      this.score()
      const shadow = await this.shadow()
      if (this.state == DBState.New || (force && this.state == DBState.Corrupt)) {
        this.ds.insert(this.clean(), async (err, doc: ContactModel) => {
          if (err || !doc) return s({
            error: err ? (err.message + err.stack) : "Failed to save new/corrupt Contact."
          })
          this.state = DBState.OK

          return s(doc)
        })
      } else {
        if (isDBError(shadow)) return s(shadow)

        this.ds.update({ email: this.email }, this.clean(), {}, async (err) => {
          if (err) return s({error: err.message + err.stack})

          return s(await this.shadow())
        })

      }
    })
  }

  purge(): Promise<boolean> {
    return new Promise(async (s, _) => {
      const shadow = await this.shadow()
      if (isDBError(shadow)) return s(false)

      this.ds.remove({ email: this.email }, {}, (err) => {
        if (err) return s(false)

        this.state = DBState.Corrupt
        return s(true)
      })
    })
  }

  static fromEmail(db: DB, email: string): Promise<Contact | DBError> {
    return new Promise((s, _) => {
      const ds = db.stores.Contact
      ds.findOne({ email }, (err, doc: ContactModel) => {
        if (err || !doc) {
          return s({
            error: "A contact with that email does not exist.",
            dne: !err
          })
        }
        const c = new Contact(db, doc)
        c.state = DBState.OK
        return s(c)
      })
    })
  }

  static async fromEmailOrCreate(db: DB, email: string, name: string): Promise<Contact | DBError> {
    let contact = await this.fromEmail(db, email)
    if (name.includes('@')) name = name.toLowerCase()
    else name = name.charAt(0).toUpperCase() + name.slice(1)
    if (isDBError(contact)) {
      if (contact.dne) {
        contact = new Contact(db, {
          email, name,
          received: 0,
          sent: 0,
          priority: -1,
          lastSeen: new Date(),
          audit_log: ["created new contact with email " + email + " and name " + name]
        })
        const saved = await contact.save()
        if (isDBError(saved)) return saved
        else return contact
      } else return contact
    } else {
      if (contact.name != name && !(name.includes('@'))) {
        contact.audit_log.push("changed name to " + name)
        contact.name = name
        await contact.save()
      }
      return contact
    }
  }

  //! Sanitizes input as this is client facing
  static async fromReceived(db: DB, email: string, name: string): Promise<Contact | DBError> {

    email = email.toLowerCase().trim()
    if (!name) name = ''
    name = name.trim()

    const contact = await this.fromEmailOrCreate(db, email, name)
    if (isDBError(contact)) return contact

    contact.received += 1
    contact.lastSeen = new Date()

    const saved = await contact.save()
    if (isDBError(saved)) return saved
    return contact
  }
  //! Sanitizes input as this is client facing
  static async fromSent(db: DB, email: string, name: string): Promise<Contact | DBError> {

    email = email.toLowerCase().trim()
    if (!name) name = ''
    name = name.trim()

    const contact = await this.fromEmailOrCreate(db, email, name)
    if (isDBError(contact)) return contact

    contact.sent += 1
    contact.lastSeen = new Date()

    const saved = await contact.save()
    if (isDBError(saved)) return saved
    return contact
  }

  static search(db: DB, partial: string): Promise<Contact[] | DBError> {
    const ds = db.stores.Contact
    return new Promise((s, _) => {
      //? if the search string is short, only search beginning of string
      const pattern = partial.length <3 ? '^' + partial : partial
      const regex = new RegExp(pattern, 'gi')
      ds.find({
        $or: [
          { name: { $regex: regex } },
          { email: { $regex: regex } },
        ]
      }).sort({ priority: -1, lastSeen: -1 }).exec((err, docs: ContactModel[]) => {
        if (err || !docs) return s({
          error: err ? err.message + err.stack : "Could not find contacts matching the query."
        })
        const contacts: Contact[] = docs.map(doc => {
          const c = new Contact(db, doc)
          c.state = DBState.OK
          return c
        })
        return s(contacts)
      })
    })
  }

}

export interface AttachmentModel extends Omit<EmbeddedMouseionAttachment, "content"> {
  filepath: string
  storagePath: string
}

class Attachment implements AttachmentModel {
  readonly db: DB
  readonly ds: Datastore

  readonly filepath: string
  filename: string
  contentType: string
  date: Date
  size: number
  cid: string
  related: boolean
  checksum: string
  author: EmailParticipant
  storagePath: string

  private state: DBState = DBState.New

  //? Call with any prio then immediately save to calculate priority
  constructor(db: DB, data: AttachmentModel) {
    this.db = db
    this.ds = this.db.stores.Attachment

    this.filepath = data.filepath
    this.storagePath = data.storagePath
    this.filename = data.filename
    this.contentType = data.contentType
    this.date = new Date(data.date)
    this.size = data.size
    this.cid = data.cid
    this.related = data.related
    this.checksum = data.checksum
    this.author = data.author
    autoBind(this)
  }

  /** Utility method to make life easier for the structured clone algorithm */
  clean(): AttachmentModel {
    return {
      filepath: this.filepath,
      storagePath: this.storagePath,
      filename: this.filename,
      contentType: this.contentType,
      date: this.date,
      size: this.size,
      cid: this.cid,
      related: this.related,
      checksum: this.checksum,
      author: this.author
    }
  }

  /** Returns the "shadow," essentially what is in the DB */
  shadow(): Promise<AttachmentModel | DBError> {
    return new Promise((s, _) => {
      if (this.state == DBState.New) return s({
        error: "Tried to find the shadow for a Attachment that has yet to be saved."
      })
      this.ds.findOne({ filepath: this.filepath }, (err, doc: AttachmentModel) => {
        if (err || !doc) {
          this.state = DBState.Corrupt
          return s({
            error: "The shadow for the Attachment no longer exists. Attachment is in a corrupt state."
          })
        }
        this.state = DBState.OK
        doc.date = new Date(doc.date)
        return s(doc)
      })
    })
  }

  /** Resets to whatever is in DB */
  async reset() {
    const shadow = await this.shadow()
    if (isDBError(shadow)) throw new Error(shadow.error)
    if (this.state != DBState.OK) throw new Error(
      "Tried resetting a Attachment that " +
        (this.state == DBState.New) ? "does not exist." : "is corrupted."
    )
    const {
      filename, contentType, date, size, cid, related, checksum, author
    } = shadow
    this.filename = filename
    this.contentType = contentType
    this.date = date
    this.size = size
    this.cid = cid
    this.related = related
    this.checksum = checksum
    this.author = author
  }

  save({force=false} ={}): Promise<AttachmentModel | DBError> {
    return new Promise(async (s, _) => {
      const shadow = await this.shadow()
      if (this.state == DBState.New || (force && this.state == DBState.Corrupt)) {
        this.ds.insert(this.clean(), async (err, doc: AttachmentModel) => {
          if (err || !doc) return s({
            error: err ? (err.message + err.stack) : "Failed to save new/corrupt Attachment."
          })
          this.state = DBState.OK

          return s(doc)
        })
      } else {
        if (isDBError(shadow)) return s(shadow)

        this.ds.update({ filepath: this.filepath }, this.clean(), {}, async (err) => {
          if (err) return s({error: err.message + err.stack})

          return s(await this.shadow())
        })

      }
    })
  }

  purge(): Promise<boolean> {
    return new Promise(async (s, _) => {
      const shadow = await this.shadow()
      if (isDBError(shadow)) return s(false)

      this.ds.remove({ filepath: this.filepath }, {}, (err) => {
        if (err) return s(false)

        this.state = DBState.Corrupt
        return s(true)
      })
    })
  }

  static fromFilepath(db: DB, filepath: string): Promise<Attachment | DBError> {
    return new Promise((s, _) => {
      const ds = db.stores.Attachment
      ds.findOne({ filepath }, (err, doc: AttachmentModel) => {
        if (err || !doc) {
          return s({
            error: "An attachment with that email does not exist.",
            dne: !err
          })
        }
        const a = new Attachment(db, doc)
        a.state = DBState.OK
        return s(a)
      })
    })
  }

  static async fromEmbeddedMouseionAttachment(db: DB, fullAttachment: EmbeddedMouseionAttachment, filepath: string, storagePath: string): Promise<Attachment | DBError> {
    let attachment = await this.fromFilepath(db, filepath)
    if (isDBError(attachment)) {
      if (attachment.dne) {
        attachment = new Attachment(db, {
          filepath, storagePath,
          filename: fullAttachment.filename,
          contentType: fullAttachment.contentType,
          date: fullAttachment.date,
          size: fullAttachment.size,
          cid: fullAttachment.cid,
          related: fullAttachment.related,
          checksum: fullAttachment.checksum,
          author: fullAttachment.author
        })
        const saved = await attachment.save()
        if (isDBError(saved)) return saved
        else return attachment
      } else return attachment
    } else return attachment
  }

  static search(db: DB, partial: string): Promise<Attachment[] | DBError> {
    const ds = db.stores.Attachment
    return new Promise((s, _) => {
      //? if the search string is short, only search beginning of string
      const pattern = partial.length <3 ? '^' + partial : partial
      const regex = new RegExp(pattern, 'gi')
      ds.find({
        filename: { $regex: regex },
        related: false
      }).sort({ date: -1 }).exec((err, docs: AttachmentModel[]) => {
        if (err || !docs) return s({
          error: err ? err.message + err.stack : "Could not find attachments matching the query."
        })
        const attachments: Attachment[] = docs.map(doc => {
          const a = new Attachment(db, doc)
          a.state = DBState.OK
          return a
        })
        return s(attachments)
      })
    })
  }

}