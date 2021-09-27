//? Tailor is the threading system used by Mouseion.
//* See RFC 5256: https://datatracker.ietf.org/doc/html/rfc5256

//? Threading can be completed as a 3 phase process:
//? Phase 1: Exhaustively find all previous messages in a thread using reply-to and references
//? Phase 2: Combine threads that meet certain requirements
//? Phase 3: If the thread folder is a board or the inbox,
//?          ensure every message not present in another special folder
//?          is present in that board/inbox. (Generally used for board unity)
//! Note: Phase 2 and 3 are NOT successive, and their queues are fulfilled by Phase 1.

import Custodian from "../managers/cleaners";
import Folders from "../managers/folders";
import Register from "../managers/register";
import { getLocation, MessageModel } from "../pantheon/pantheon";
import { PantheonProxy } from "../pantheon/puppeteer";
import { PostOfficeProxy } from "../post-office/puppeteer";
import { IMAPConfig, MessageID, SearchQuery } from "../post-office/types";
import BoardRulesQueue from "../queues/board-rules";
import ContactsQueue from "../queues/contacts";
import Janitor from "../utils/cleaner";
import { Logger, LumberjackEmployer } from "../utils/logger";
import Operator from "./operator";
import { EmailWithReferences } from "../utils/types";
import autoBind from 'auto-bind'

export default class Tailor {

  private readonly Log: Logger
  private readonly pantheon: PantheonProxy
  private readonly p1_seen: Set<string> = new Set()
  private readonly p2_queue: string[] = []
  private readonly p3_queue: string[] = []
  private readonly custodian: Custodian
  private readonly courier: PostOfficeProxy
  private readonly folders: Folders
  private readonly provider: string
  private readonly contactQ: ContactsQueue
  private readonly boardrulesQ: BoardRulesQueue
  private readonly internal_use: boolean
  private readonly operator: Operator

  constructor(Registry: Register, opts: {
    internal_use: boolean
  }) {
    const Lumberjack = Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack(opts.internal_use ? 'Seamstress' : 'Tailor')
    this.pantheon = Registry.get('Pantheon') as PantheonProxy
    this.custodian = Registry.get('Custodian') as Custodian
    this.courier = Registry.get('Courier') as PostOfficeProxy
    this.folders = Registry.get('Folders') as Folders
    const config = Registry.get('IMAP Config') as IMAPConfig
    this.provider = config.provider || ''
    this.contactQ = Registry.get('Contacts Queue') as ContactsQueue
    this.boardrulesQ = Registry.get('Board Rules Queue') as BoardRulesQueue
    this.internal_use = opts.internal_use
    this.operator = Registry.get('Cypher') as Operator
    autoBind(this)
  }

  private async fetch_reference(referenceMID: MessageID, searchFolder: string, E: EmailWithReferences): Promise<boolean> {
    const janitor: Janitor = await this.custodian.get(searchFolder)
    const query = new SearchQuery()
    query.hasHeader('Message-ID', referenceMID)
    const uids = await this.courier.messages.searchMessages(searchFolder, query.compile())

    let found = false

    //? Thread every UID found on the server
    for (const uid of uids) {
      if (uid == 0) continue; //? invalid UID
      if (E.M.envelope.folder == searchFolder && E.M.envelope.uid == uid) continue; //? same UID
      const local_message = await this.pantheon.db.messages.find.uid(searchFolder, uid)
      if (local_message) continue; //? skip if we already have it
      const raw_email = (await this.courier.messages.listMessagesWithHeaders(searchFolder, '' + uid, {
        parse: true,
        markAsSeen: false
      }))?.[0]
      if (!raw_email) continue; //? skip if we can't find it
      const email = await janitor.headers(raw_email)

      //! this may have issues if not done in sequential order by date
      await this.phase_1(email, {
        deepThreading: false //! Experimental, adherent still to RFC 5256
      })
      found = true
    }

    return found
  }

  private async thread_reference(email: EmailWithReferences, referenceMID: MessageID, existingTID=''): Promise<string> {
    const local_message = await this.pantheon.db.messages.find.mid(referenceMID)
    if (local_message) {
      //? If the reference exists locally, we work with existing threads
      if (existingTID) {
        //? If we already have a thread going we merge them together
        if (local_message.tid == existingTID) return existingTID
        //? the reference is the eul to avoid collapsing upwards
        await this.pantheon.db.threads.merge(local_message.tid, existingTID)
        return existingTID
      } else {
        //? If we don't have a thread going yet, we HAVE to collapse upwards
        const m: MessageModel = {
          mid: email.M.envelope.mid,
          locations: [{
            folder: email.folder,
            uid: email.M.envelope.uid
          }],
          seen: email.M.flags.seen,
          starred: email.M.flags.starred,
          timestamp: new Date(email.M.envelope.date),
          subject: email.M.envelope.cleanSubject,
          tid: local_message.tid,
        }
        await this.pantheon.db.messages.add(m)
        return local_message.tid
      }
    } else {
      //? If we don't have the reference we need to fetch it from the remote
      //? We do this by searching prospective folders
      let found = false
      if (email.M.envelope.mid == referenceMID) return existingTID

      const archive = this.folders.archive()
      if (archive) found = await this.fetch_reference(referenceMID, archive, email)

      //? GMail uses archive as All Mail, so there is no need to search anything other than that
      if (this.provider != 'google' && !found) {

        //! Search precedence:
        //! 1. Sent
        //! 2. Inbox
        //! 3. Trash

        const sent = this.folders.sent()
        if (sent) found = await this.fetch_reference(referenceMID, sent, email)
        if (!found) {
          const inbox = await this.folders.inbox()
          if (inbox) found = await this.fetch_reference(referenceMID, inbox, email)
          if (!found) {
            const trash = await this.folders.trash()
            if (trash) found = await this.fetch_reference(referenceMID, trash, email)
          }
        }
      }

      if (found) return await this.thread_reference(email, referenceMID, existingTID)
      return existingTID
    }
  }

  private async thread_subject() {
    return new Error("Not implemented yet.")
  }

  /**
   * You can disable deepThreading for speed on messages that don't need immediate threading.
   * They will still be threaded on-demand by other calls to phase 1.
  */
  async phase_1(email: EmailWithReferences, {
    deepThreading=true
  } ={}): Promise<string | null> {
    if (!(email.M.references)) {
      this.Log.error("MID", email.M.envelope.mid, "does not meet the minimum parse level.")
      return null
    }
    const MID = email.M.envelope.mid
    const local_message = await this.pantheon.db.messages.find.mid(MID)

    //? If the message exists locally, we just update it
    if (local_message) {
      local_message.locations = [{
        folder: email.folder,
        uid: email.M.envelope.uid
      }]
      local_message.seen = email.M.flags.seen
      local_message.starred = email.M.flags.starred
      local_message.timestamp = new Date(email.M.envelope.date)
      await this.pantheon.db.messages.add(local_message, {
        overwrite: true
      })
      this.p2_queue.push(local_message.tid)
      return local_message.tid
    }

    if (this.p1_seen.has(MID)) return null;
    this.p1_seen.add(MID)

    let TID = ''

    //? If deepThreading is enabled let's go through all the references
    if(deepThreading) {
      this.Log.time("Threaded", MID, "with", email.M.references.length, "references")
      if (email.M.references.length > 0) {
        //? reverse to preserve oldest-first
        const referenceMIDs = email.M.references.slice().reverse()
        TID = (await Promise.all(
          referenceMIDs.map(referenceMID => this.thread_reference(email, referenceMID, TID))
        )).filter(_ => _)?.[0] || ''
      } else {
        // this.Log.log("MID", email.M.envelope.mid, "does not need threading.")
      }
      // TODO: subject threading
      this.Log.timeEnd("Threaded", MID, "with", email.M.references.length, "references")
    }

    if (!TID) {
      //? Still no TID? Must be a new thread :)
      const m: MessageModel = {
        mid: email.M.envelope.mid,
        locations: [{
          folder: email.folder,
          uid: email.M.envelope.uid
        }],
        seen: email.M.flags.seen,
        starred: email.M.flags.starred,
        timestamp: new Date(email.M.envelope.date),
        subject: email.M.envelope.cleanSubject,
        tid: '', //? allow auto-generation
      }
      await this.pantheon.db.messages.add(m)
      const added_message = await this.pantheon.db.messages.find.mid(MID)
      if (added_message) TID = added_message.tid
    } else {
      //? If we already have a TID, add the location
      const m: MessageModel = {
        mid: email.M.envelope.mid,
        locations: [{
          folder: email.folder,
          uid: email.M.envelope.uid
        }],
        seen: email.M.flags.seen,
        starred: email.M.flags.starred,
        timestamp: new Date(email.M.envelope.date),
        subject: email.M.envelope.cleanSubject,
        tid: TID,
      }
      await this.pantheon.db.messages.add(m)
    }

    //? If we were able to succeed, queue it up
    if (TID) {
      this.p2_queue.push(TID)
      this.contactQ.queue(MID)
      if (!(this.internal_use)) {
        if (email.folder == this.folders.inbox() || this.folders.isBoard(email.folder)) {
          this.boardrulesQ.queue(MID)
        }
        this.p3_queue.push(TID)
      }
    }

    return TID
  }

  async phase_2() {
    this.Log.time("Phase 2")
    const mergedTIDs: Set<string> = new Set() //? wOW DynAMiC PRoGrAmmInG ?!
    while (this.p2_queue.length > 0) {
      const TID = this.p2_queue.pop()
      if (!TID) continue;
      if (mergedTIDs.has(TID)) continue;

      const thread = await this.pantheon.db.threads.find.tid(TID)
      if (!thread) continue;

      const date = new Date(thread.date)
      const messages = await this.pantheon.db.threads.messages(TID)
      if (messages.length <= 0) continue;
      const subject = messages[0].subject

      const same_subject_messages = await this.pantheon.db.messages.find.subject(subject)
      if (!same_subject_messages) continue;

      const subjectTIDs: Set<string> = new Set()
      const WEEK_MS = 7 * 24 * 60 * 60 * 1000

      same_subject_messages.forEach(({ timestamp, tid }) => {
        timestamp = new Date(timestamp)
        //? ignore ourselves
        if (tid == TID) return;
        //? ignore merged threads
        if (mergedTIDs.has(tid)) return;
        //? ignore anything newer
        if (timestamp > date) return;
        //? ignore anything too old
        if (Math.abs(date.valueOf() - timestamp.valueOf()) > 16 * WEEK_MS) return;
        //? add TID
        subjectTIDs.add(tid)
      })

      for (const tid of subjectTIDs) {
        //? merge each same subject thread into our current thread
        await this.pantheon.db.threads.merge(tid, TID)
        mergedTIDs.add(tid)
      }

    }
    this.Log.timeEnd("Phase 2")
  }

  async phase_3() {
    this.Log.time("Phase 3")
    const unitedTIDs: Set<string> = new Set()
    while (this.p3_queue.length > 0) {
      const TID = this.p3_queue.pop()
      if (!TID) continue;
      if (unitedTIDs.has(TID)) continue;

      const thread = await this.pantheon.db.threads.find.tid(TID)
      if (!thread) continue;

      const messages = await this.pantheon.db.threads.messages(TID, {
        descending: false
      })
      if (messages.length <= 0) continue;

      const board = thread.folder
      if (!(this.folders.isBoard(board))) {
        unitedTIDs.add(TID)
        continue;
      }

      //? ensure all messages are in the board on mailserver
      for (const message of messages) {
        const folders = message.locations.map(({ folder }) => folder)
        const inbox = this.folders.inbox()
        if (!inbox) continue;
        const inboxLOC = getLocation(message.locations, inbox)
        if (!inboxLOC) continue;

        const boards = folders.filter(folder => this.folders.isBoard(folder))
        if (boards.length == 1 && boards[0] == board) continue;

        this.Log.log("Uniting thread message with MID", message.mid)

        //? it must be in the main board exclusively
        if (boards.length > 1) {
          //? delete message from all other boards
          for (const { folder, uid } of message.locations) {
            if (this.folders.isBoard(folder) && folder != board) {
              await this.operator.delete(folder, uid)
            }
          }
        }

        //? it must be in the main board
        if (!(boards.includes(board))) {
          await this.operator.copy(inboxLOC.folder, inboxLOC.uid, board)
        }
      }

      unitedTIDs.add(TID)
    }
    this.Log.timeEnd("Phase 3")
  }

  unity(...tids: string[]) {
    this.p3_queue.push(...tids)
  }

}