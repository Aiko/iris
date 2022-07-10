import Tailor from "./tailor"
import Custodian from "../managers/cleaners"
import Folders from "../managers/folders"
import Register from "../managers/register"
import { MessageModel } from "../pantheon/pantheon"
import { PantheonProxy } from "../pantheon/puppeteer"
import { PostOfficeProxy } from "../post-office/puppeteer"
import { CopyUID, MoveUID, SearchQuery } from "../post-office/types"
import { Logger, LumberjackEmployer } from "../utils/logger"
import retry from "../utils/retry"
import Storage from "../utils/storage"
import autoBind from 'auto-bind'
export default class Operator {
  private readonly Log: Logger
  private readonly pantheon: PantheonProxy
  private readonly courier: PostOfficeProxy
  private readonly custodian: Custodian
  private readonly folders: Folders
  private readonly auto_increment_cursor: boolean
  private readonly meta: Storage
  private readonly tailor: Tailor

  constructor(private readonly Registry: Register, {
    auto_increment_cursor=false,
    internal_use=false
  } ={}) {
    if (internal_use) this.tailor = Registry.get('Seamstress') as Tailor
    else this.tailor = Registry.get('Tailor') as Tailor
    this.pantheon = Registry.get('Pantheon') as PantheonProxy
    this.courier = Registry.get('Courier') as PostOfficeProxy
    this.custodian = Registry.get('Custodian') as Custodian
    this.folders = Registry.get('Folders') as Folders
    this.meta = Registry.get('Metadata Storage') as Storage
    const Lumberjack = Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Operator')
    this.auto_increment_cursor = auto_increment_cursor
    autoBind(this)
  }

  private async pre_op() {
    if (this.auto_increment_cursor) await this.pantheon.cursor.next()
  }

  private async post_op(success=true) {
    if (this.auto_increment_cursor) {
      if (!success) await this.pantheon.cursor.prev()
      const cursor = await this.pantheon.cursor.get()
      await this.meta.store('cursor', cursor)
    }
  }

  private async getMessage(folder: string, uid: string | number): Promise<MessageModel | null> {
    const janitor = await this.custodian.get(folder)
    let message = await this.pantheon.db.messages.find.uid(folder, uid)
    if (message) return message
    else {
      this.Log.warn(`Did not have <folder:${folder}, uid:${uid}> locally, fetching from mailserver.`)
      const email_raw = (await this.courier.messages.listMessagesWithHeaders(folder, '' + uid))?.[0]

      if (!email_raw) {
        this.Log.error(`Unable to find <folder:${folder}, uid:${uid}> on the mailserver.`)
        return null
      }

      const email = await janitor.headers(email_raw)
      if (!(email.M.envelope.mid)) {
        this.Log.error(`When fetching <folder:${folder}, uid:${uid}>, got an envelope without an MID.`)
        return null
      }

      await this.tailor.phase_1(email)

      await this.pantheon.cache.envelope.cache(email.M.envelope.mid, email)
      await this.pantheon.cache.headers.cache(email.M.envelope.mid, email)

      return await this.pantheon.db.messages.find.uid(folder, uid)
    }
  }

  private async getMessages(folder: string, uids: string[]): Promise<MessageModel[]> {
    const janitor = await this.custodian.get(folder)
    const messages = await Promise.all(uids.map(async (uid) => {
      let message = await this.pantheon.db.messages.find.uid(folder, uid)
      if (message) return message
      else {
        this.Log.warn(`Did not have <folder:${folder}, uid:${uid}> locally, fetching from mailserver.`)
        const email_raw = (await this.courier.messages.listMessagesWithHeaders(folder, '' + uid))?.[0]

        if (!email_raw) {
          this.Log.error(`Unable to find <folder:${folder}, uid:${uid}> on the mailserver.`)
          return null
        }

        const email = await janitor.headers(email_raw)
        if (!(email.M.envelope.mid)) {
          this.Log.error(`When fetching <folder:${folder}, uid:${uid}>, got an envelope without an MID.`)
          return null
        }

        await this.tailor.phase_1(email)

        await this.pantheon.cache.envelope.cache(email.M.envelope.mid, email)
        await this.pantheon.cache.headers.cache(email.M.envelope.mid, email)

        return await this.pantheon.db.messages.find.uid(folder, uid)
      }
    }))
    return messages.filter(_ => _) as MessageModel[]
  }

  async star(folder: string, uid: string | number): Promise<boolean> {
    try {
      await this.pre_op()
      const message = await this.getMessage(folder, uid)
      if (!message) return false
      await this.courier.messages.flagMessages(folder, '' + uid, {
        add: ["\\Flagged"]
      })
      await this.pantheon.db.messages.update(message.mid, {
        starred: true,
        tid: null, seen: null
      })
      await this.post_op()
      return true
    } catch (e) {
      this.Log.error(`Failed to star <folder:${folder}, uid:${uid}> due to error:`, e)
      await this.post_op(false)
      return false
    }
  }

  async unstar(folder: string, uid: string | number): Promise<boolean> {
    try {
      await this.pre_op()
      const message = await this.getMessage(folder, uid)
      if (!message) return false
      await this.courier.messages.flagMessages(folder, '' + uid, {
        remove: ["\\Flagged"]
      })
      await this.pantheon.db.messages.update(message.mid, {
        starred: false,
        tid: null, seen: null
      })
      await this.post_op()
      return true
    } catch (e) {
      this.Log.error(`Failed to unstar <folder:${folder}, uid:${uid}> due to error:`, e)
      await this.post_op(false)
      return false
    }
  }

  async read(folder: string, uid: string | number): Promise<boolean> {
    try {
      await this.pre_op()
      const message = await this.getMessage(folder, uid)
      if (!message) return false
      await this.courier.messages.flagMessages(folder, '' + uid, {
        add: ["\\Seen"]
      })
      await this.pantheon.db.messages.update(message.mid, {
        seen: true,
        tid: null, starred: null
      })
      await this.post_op()
      return true
    } catch (e) {
      this.Log.error(`Failed to mark <folder:${folder}, uid:${uid}> as seen due to error:`, e)
      await this.post_op(false)
      return false
    }
  }

  async unread(folder: string, uid: string | number): Promise<boolean> {
    try {
      await this.pre_op()
      const message = await this.getMessage(folder, uid)
      if (!message) return false
      await this.courier.messages.flagMessages(folder, '' + uid, {
        remove: ["\\Seen"]
      })
      await this.pantheon.db.messages.update(message.mid, {
        seen: false,
        tid: null, starred: null
      })
      await this.post_op()
      return true
    } catch (e) {
      this.Log.error(`Failed to mark <folder:${folder}, uid:${uid}> as unseen due to error:`, e)
      await this.post_op(false)
      return false
    }
  }

  /** If the message is in the inbox purges it totally, otherwise just pops a location. */
  async delete(folder: string, uid: string | number): Promise<boolean> {
    try {
      await this.pre_op()

      const message = await this.getMessage(folder, uid)
      if (!message) return false

      await this.courier.messages.deleteMessages(folder, '' + uid)

      if (folder == this.folders.inbox()) {
        await this.pantheon.db.messages.purge.all(message.mid)
      } else {
        await this.pantheon.db.messages.purge.location(folder, uid, {
          purgeIfEmpty: true
        })
      }

      await this.post_op()
      return true
    } catch (e) {
      this.Log.error(`Failed to mark <folder:${folder}, uid:${uid}> as seen due to error:`, e)
      await this.post_op(false)
      return false
    }
  }

  async copy(srcFolder: string, uid: string | number, destFolder: string): Promise<number | null> {
    try {
      await this.pre_op()

      const message = await this.getMessage(srcFolder, uid)
      if (!message) return null

      const destUID: CopyUID = await this.courier.messages.copyMessages(srcFolder, destFolder, '' + uid)

      if (destUID.uid == null) {
        this.Log.error(`Failed to copy <folder:${srcFolder}, uid:${uid}> to ${destFolder} due to invalid destUID:`, destUID)
        return null
      }

      message.locations.push({
        folder: destFolder,
        uid: destUID.uid
      })
      await this.pantheon.db.messages.add(message)

      await this.post_op()
      return destUID.uid
    } catch (e) {
      this.Log.error(`Failed to copy <folder:${srcFolder}, uid:${uid}> to ${destFolder} due to error:`, e)
      await this.post_op(false)
      return null
    }
  }

  async move(srcFolder: string, uid: string | number, destFolder: string): Promise<number | null> {
    try {
      await this.pre_op()

      const message = await this.getMessage(srcFolder, uid)
      if (!message) return null

      const destUID: MoveUID = await this.courier.messages.moveMessages(srcFolder, destFolder, '' + uid)

      if (destUID.uid == null) {
        this.Log.error(`Failed to move <folder:${srcFolder}, uid:${uid}> to ${destFolder} due to invalid destUID:`, destUID)
        return null
      }

      message.locations.push({
        folder: destFolder,
        uid: destUID.uid
      })
      await this.pantheon.db.messages.add(message)
      await this.pantheon.db.messages.purge.location(srcFolder, uid)

      await this.post_op()
      return destUID.uid
    } catch (e) {
      this.Log.error(`Failed to move <folder:${srcFolder}, uid:${uid}> to ${destFolder} due to error:`, e)
      await this.post_op(false)
      return null
    }
  }

  async moveMultiple(srcFolder: string, uids: string[] | string, destFolder: string): Promise<number | null> {
    try {
      await this.pre_op()

      if (typeof uids == 'string') {
        const destUID: MoveUID = await this.courier.messages.moveMessages(srcFolder, destFolder, uids)
        if (destUID.uid == null) {
          this.Log.error(`Failed to move <folder:${srcFolder}, uids:${uids}> to ${destFolder} due to invalid destUIDs:`, destUID)
          return null
        }

        await this.post_op()
        return destUID.uid

      } else {
        const messages = await this.getMessages(srcFolder, uids)
        if (!messages) return null

        const destUID: MoveUID = await this.courier.messages.moveMessages(srcFolder, destFolder, uids.join(","))

        if (destUID.uid == null) {
          this.Log.error(`Failed to move <folder:${srcFolder}, uids:${uids}> to ${destFolder} due to invalid destUIDs:`, destUID)
          return null
        }

        await this.post_op()
        return destUID.uid
      }
    }
    catch (e) {
      this.Log.error(`Failed to move <folder:${srcFolder}, uids:${uids}> to ${destFolder} due to error:`, e)
      await this.post_op(false)
      return null
    }
  }


  async archive(folder: string, uid: string | number): Promise<number | null> {
    const archive = this.folders.archive()
    if (archive) return await this.move(folder, uid, archive)
    return null
  }

  async archiveMultiple(folder: string, uids: string[]): Promise<number | null> {
    const archive = this.folders.archive()
    if (archive) return await this.moveMultiple(folder, uids, archive)
    return null
  }

  async searchMessages(folder: string, query: string): Promise<MessageModel[]> {
    try {
      await this.pre_op()
      const q = new SearchQuery()
      q.term(query)
      const uids = await this.courier.messages.searchMessages(folder, q.compile())
      this.Log.log(`${uids.length} search results for '${query}' in ${folder}:`, uids)
      await this.post_op()
      return await this.getMessages(folder, uids.map(uid => '' + uid))
    } catch (e) {
      this.Log.error(`Failed to search <folder:${folder}> due to error:`, e)
      await this.post_op(false)
      return []
    }
  }

  // TODO: use retry here

}