import crypto from 'crypto'
import fs2 from 'fs-extra'
import path from 'path'
import Datastore from 'nedb'
import Storage from '../utils/storage'
import { EmailFull, EmailParticipant, EmailParticipantModel, EmailWithEnvelope, EmailWithReferences } from '../utils/types'
import autoBind from 'auto-bind'

// TODO: attachment DB & caching

type CacheLevels = "L1" | "L2" | "L3" | "L3b"
interface CacheBinding<T> {
  cache: (key: string, data: T) => Promise<void>
  check: (key: string) => Promise<T | false>
}

export class Cache {
  readonly dir: string
  readonly paths: Record<CacheLevels, string>
  readonly caches: Record<CacheLevels, Storage>

  private path(part: string) {
    return path.join(this.dir, part)
  }

  private storage(level: CacheLevels) {
    return new Storage(this.paths[level])
  }

  envelope: CacheBinding<EmailWithEnvelope>
  headers: CacheBinding<EmailWithReferences>
  content: CacheBinding<EmailFull>
  full: CacheBinding<EmailFull>

  constructor(dir: string) {
    this.dir = dir
    this.dir = this.path('cache')


    process.title = "Mouseion - Pantheon: " + this.dir

    this.paths = {
      L1: this.path('L1'),
      L2: this.path('L2'),
      L3: this.path('L3'),
      L3b: this.path('L3b'),
    }

    this.caches = {
      L1: this.storage("L1"),
      L2: this.storage("L2"),
      L3: this.storage("L3"),
      L3b: this.storage("L3b")
    }

    //? we need to promisify methods as SP only uses promises
    const promisify = <T>(fn: Storage): CacheBinding<T> => {
      return {
        cache: (key: string, value: T) => fn.cache(key, value),
        check: (key: string): Promise<T | false> => fn.check(key)
      }
    }

    this.envelope = promisify<EmailWithEnvelope>(this.caches.L1)
    this.headers = promisify<EmailWithReferences>(this.caches.L2)
    this.content = promisify<EmailFull>(this.caches.L3b)
    this.full = promisify<EmailFull>(this.caches.L3)

    autoBind(this)
  }
}

type DBModels = "Message" | "Thread" | "Contact"

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

  constructor(dir: string, cursor: number, user: string) {
    this.cursor = cursor
    this.dir = dir
    this.dir = this.path("db")
    this.user = user
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
      })
    }
    autoBind(this)
  }

  //*-------------- Utility methods for messages
  async findMessageWithMID(mid: string): Promise<MessageModel | null> {
    const message = await Message.fromMID(this, mid)
    if (isDBError(message)) {
      if (!(message.dne)) console.error(message.error)
      return null
    }
    return message.clean()
  }
  async findMessagesInFolder(folder: string, {limit=5000} ={}): Promise<MessageModel[] | null> {
    const messages = await Message.fromFolder(this, folder, {limit})
    if (isDBError(messages)) {
      console.error(messages.error)
      return null
    }
    return messages.map(m => m.clean())
  }
  async findMessageWithUID(folder: string, uid: string | number): Promise<MessageModel | null> {
    const location: MessageLocation = { folder, uid }
    const message = await Message.fromLocation(this, location)
    if (isDBError(message)) {
      if (!(message.dne)) console.error(message.error)
      return null
    }
    return message.clean()
  }
  async findMessagesWithSubject(subject: string, {limit=5000} ={}): Promise<MessageModel[] | null> {
    const messages = await Message.fromSubject(this, subject, {limit})
    if (isDBError(messages)) {
      console.error(messages.error)
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
        message.tid = m.tid
        message.seen = m.seen
        message.starred = m.starred
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

    if (seen != null) message.seen = seen
    if (starred != null) message.starred = starred
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
      console.error(message.error)
      return false
    }
    return await message.purge()
  }
  async removeMessageLocation(folder: string, uid: string | number, {
    purgeIfEmpty=true
  } ={}): Promise<boolean> {
    const message = await Message.fromLocation(this, {folder, uid})
    if (isDBError(message)) {
      console.error(message.error)
      return false
    }
    return await message.removeLocation({folder, uid}, {purgeIfEmpty})
  }

  //*-------------- Utility methods for threads
  async findThreadWithTID(tid: string): Promise<ThreadModel | null> {
    const thread = await Thread.fromTID(this, tid)
    if (isDBError(thread)) {
      if (!(thread.dne)) console.error(thread.error)
      return null
    }
    return thread.clean()
  }
  async findThreadsInFolder(folder: string, {limit=5000} ={}): Promise<ThreadModel[] | null> {
    const threads = await Thread.fromFolder(this, folder, {limit})
    if (isDBError(threads)) {
      console.error(threads.error)
      return null
    }
    return threads.map(t => t.clean())
  }
  async findThreadsByLatest(folder: string, {limit=5000, start=0} ={}): Promise<ThreadModel[] | null> {
    const threads = await Thread.fromLatest(this, folder, {limit, start})
    if (isDBError(threads)) {
      console.error(threads.error)
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
      if (!(thread.dne)) console.error(thread.error)
      return []
    }
    const messages = await thread.messages({descending})
    return messages.map(message => message.clean())
  }

  //*-------------- Utility methods for contacts
  async findContacts(searchTerm: string): Promise<ContactModel[] | null> {
    const contacts = await Contact.search(this, searchTerm)
    if (isDBError(contacts)) {
      console.error(contacts.error)
      return null
    }
    return contacts.map(c => c.clean())
  }
  async updateContactReceived(email: string, name: string): Promise<boolean> {
    const contact = await Contact.fromReceived(this, email, name)
    if (isDBError(contact)) {
      console.error(contact.error)
      return false
    }
    return true
  }
  async updateContactSent(email: string, name: string): Promise<boolean> {
    const contact = await Contact.fromSent(this, email, name)
    if (isDBError(contact)) {
      console.error(contact.error)
      return false
    }
    return true
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
            participants: []
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
      if (overwrite) this.locations = this.locations.map(L => {
        if (L.folder == m.folder) L.uid = m.uid
        return L
      })
    } else {
      this.locations.push(m)
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
  folder: string //? core foldeer for thread
  tid: string
  participants: EmailParticipantModel[]
}

class Thread implements ThreadModel {
  readonly db: DB
  readonly ds: Datastore

  mids: string[]
  date: Date
  cursor: number = 0
  folder: string
  tid: string
  participants: EmailParticipantModel[]

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
    this.tid = data.tid
    this.participants = cloneN(data.participants)
    autoBind(this)
  }

  /** Utility method to make life easier for the structured clone algorithm */
  clean(): ThreadModel {
    return {
      mids: this.mids.map((mid: string) => mid),
      date: this.date,
      cursor: this.cursor,
      folder: this.folder,
      tid: this.tid,
      participants: cloneN(this.participants)
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
      mids, date, cursor, folder
    } = shadow

    this.mids = mids.map(_ => _)
    this.date = date
    this.cursor = cursor
    this.folder = folder
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
        this.ds.remove({ tid: this.tid }, {}, (err) => {
          if (err) console.error(err)
        })
      }
      return
    }

    //? set the date to the newest date (first message)
    this.date = messages[0].timestamp

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

    await this.getParticipants(messages)

    if (updateCursor) this.cursor = this.db.getCursor()

    if (save) await this.save()
  }

  private async getParticipants(messages: MessageModel[]) {
    const _this = this
    const participantAddresses = new Set()
    this.participants = messages.map(({ from, recipients, locations }): EmailParticipantModel[] => {
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

  static fromLatest(db: DB, folder: string, {limit=5000, start=0} ={}): Promise<Thread[] | DBError> {
    return new Promise((s, _) => {
      const ds = db.stores.Thread
      ds.find({ folder, }).sort({ date: -1 }).limit(limit).exec((err, docs: ThreadModel[]) => {
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
    await eul.calibrate()

    //? grant visas
    const visa_holders = immigrants.filter(immigrant => !(gap.hasMID(immigrant)))
    visa_holders.map(mid => gap.mids.push(mid))
    await gap.calibrate()

    const results:(MessageModel | DBError)[] = await Promise.all(visa_holders.map(async mid => {
      const message = await Message.fromMID(db, mid)
      if (isDBError(message)) return message
      message.tid = gap.tid //? can't use .changeThread because eul is deleted
      return await message.save()
    }))

    for (const result of results) {
      if (isDBError(result)) console.error(result.error)
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

  private state: DBState = DBState.New

  //? Call with any prio then immediately save to calculate priority
  constructor(db: DB, data: ContactModel) {
    this.db = db
    this.ds = this.db.stores.Message

    this.email = data.email
    this.name = data.name
    this.sent = data.sent
    this.received = data.received
    this.lastSeen = new Date(data.lastSeen)
    this.priority = data.priority
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
      priority: this.priority
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
      const ds = db.stores.Message
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
    if (isDBError(contact)) {
      if (contact.dne) {
        contact = new Contact(db, {
          email, name,
          received: 0,
          sent: 0,
          priority: -1,
          lastSeen: new Date()
        })
        const saved = await contact.save()
        if (isDBError(saved)) return saved
        else return contact
      } else return contact
    } else return contact
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
    contact.name = name || contact.name || ''

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
    contact.name = name || contact.name || ''

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
      }).sort({ priority: -1, lastSeen: 1 }).exec((err, docs: ContactModel[]) => {
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