import batchMap from '../utils/do-in-batch'
import { Logger } from '../utils/logger'

const EmailJS = require('emailjs-imap-client')
const Client = EmailJS.default
const simpleParser = require('mailparser').simpleParser

import { AttachmentRaw, CopyUID, CopyUIDSetRaw, EmailParsedRaw, EmailRaw, EmailRawBase, EmailRawWithEnvelope, EmailRawWithFlags, EmailRawWithHeaders, FlagsMod, FolderDetails, FolderMetadata, MoveUID, RawEmail, SearchQuery, SearchQueryRaw } from './types'

//? for multiple mailboxes make multiple post offices
//? to change params like OAuth, you will need to do a full close-connect
//? there is no reconnect helper method (intentional, to force you to acknowledge the cold start)
//? for this reason it is not something we recommend doing frequently
export default class PostOffice {
  host: string = ""
  port: number = 993
  user: string = ""
  private pass: string = ""
  private oauth: string = ""
  secure: boolean = false
  private client: any = null

  private readonly Log: Logger

  constructor(l: Logger) {
    this.Log = l
  }

  /** Closes a connection */
  async close() {
    this.Log.log("Closing client...")
    if (!this.client) return this.Log.warn("Tried to close a client but the client does not exist/has already been closed")
    try { await this.client.close() } catch {
      this.Log.error("A client exists but could not be closed. There is a risk of a memory leak occurring.")
    }
    this.client = null
    return true
  }

  /** Forms a new connection
   * @param {string} h - hostname of mailserver
   * @param {number} p - port of mailserver's IMAP receiver
   * @param {string} u - username
   * @param {string} w - password (leave empty if N/A)
   * @param {string} o - OAuth token (leave empty if N/A)
   * @param {boolean} s - whether or not the connection is secure
   */
  async connect(h?: string, p?: number, u?: string, w?: string, o?: string, s?: boolean) {
    this.host = h || this.host
    this.port = p || this.port
    this.user = u || this.user
    this.pass = w || this.pass
    this.oauth = o || this.oauth
    this.secure = s || this.secure

    this.Log.log("Connecting to IMAP server...")

    //? close any existing connections
    if (this.client) await this.close()

    const options = {
      logLevel: EmailJS.LOG_LEVEL_ERROR,
      auth: this.oauth ? {
        user: this.user,
        xoauth2: this.oauth
      } : {
        user: this.user,
        pass: this.pass
      },
      id: {
        version: '2.1b',
        name: 'Aiko Mail'
      },
      useSecureTransport: !!this.secure,
      enableCompression: false //! if you enable this, all of Olympus will smite you
    }
    this.Log.log("Using options:", options)

    //? form client
    this.client = new Client(this.host, this.port, options)

    //? connx to mailserv
    this.Log.log("Establishing IMAP connection...")
    await this.client.connect()

    //? register listeners
    this.client.onupdate = function (path: string, type: string, value: any) {
      if (type === 'exists') {
        // TODO: trigger check for new messages
      }
    }
    this.client.onerror = (error: any) => {
      this.Log.error('Client error:', error)
      this.close()
      // TODO: send error to some listener
    }

    this.Log.log("Setup client for", this.user, "on", this.host)
    return true
  }

  /** Checks connection (& connects if disconnected) */
  async checkConnect(): Promise<boolean> {
    if (!this.client) await this.connect()
    return true
  }

  /** Provides a folder structure object for the user's mailbox */
  async getFolders(): Promise<Record<string, FolderMetadata>> {
    if (!this.client) await this.connect()
    this.Log.log("Listing folders...")

    const folderTree = await this.client.listMailboxes().catch(this.Log.error) as any
    const helper = (mailboxes: any): Record<string, FolderMetadata> => {
      const folders: Record<string, FolderMetadata> = {}
      if (mailboxes.children) {
        mailboxes.children.map((mailbox: any) => {
          folders[mailbox.name] = {
            delimiter: mailbox.delimiter as string,
            path: mailbox.path as string,
            children: helper(mailbox),
            flags: mailbox.flags as string[],
            listed: mailbox.listed,
            subscribed: mailbox.subscribed
          }
        })
      }
      return folders
    }
    return helper(folderTree)
  }

  async newFolder(path: string) {
    if (!this.client) await this.connect()
    this.Log.log("Creating new folder...")
    await this.client.createMailbox(path).catch(this.Log.error)
    return this.Log.success("Created folder", path)
  }

  async deleteFolder(path: string) {
    if (!this.client) await this.connect()
    this.Log.log("Deleting folder...")
    await this.client.deleteMailbox(path).catch(this.Log.error)
    return this.Log.success("Deleted folder", path)
  }

  async openFolder(path: string): Promise<FolderDetails> {
    if (!this.client) await this.connect()
    this.Log.log("Selecting mailbox", path)
    const details = await this.client.selectMailbox(path, {readOnly: false, condstore: true }).catch(this.Log.error) as FolderDetails
    return details
  }

  async listMessages(
    path: string, sequence: string,
    {
      flags=true,
      envelope=true,
      headers=false,
      bodystructure=false,
      content=false,
      attachments=false,
      parse=true,
      markAsSeen=false,
      modseq='',
      cids=false,
      limit=null
    }: {
      flags?: boolean, //? contains information like starred, seen, draft
      envelope?: boolean, //? contains information like sender, subject, date
      headers?: boolean, //? contains information like references
      bodystructure?: boolean, //? the MIME type structure of the email
      content?: boolean, //? HTML and text content of email
      attachments?: boolean, //? the full content of any attachments
      parse?: boolean, //? whether to parse the content
      markAsSeen?: boolean, //? whether to mark the email as seen when fetching
      modseq?: string | number, //? change-based fetching
      cids?: boolean, //? whether to keep CID attachment links as CIDs or populate them
      limit?: number | null //? impose a maximum number of emails to fetch
    } ={}
  ): Promise<RawEmail[]> {
    if (!this.client) await this.connect()
    if (!path) throw new Error("Empty path provided to listMessages.")
    if (sequence.startsWith('0')) {
      this.Log.error("Fetch sequences cannot contain '0' as a startpoint.")
      return []
    }

    const query: string[] = []
    query.push('uid') //? all requests are by UID
    if (flags) query.push('flags')
    if (envelope) query.push('envelope')
    //? headers are automatically included in content so we do that later
    if (bodystructure) query.push('bodystructure')
    let content_key = ''
    if (content) {
      content_key = 'body[]'
      if (markAsSeen) query.push('body[]')
      else query.push('body.peek[]')
    } else {
      if (headers) {
        content_key = 'body[header.fields (references)]'
        if (markAsSeen) query.push('body[HEADER.FIELDS (REFERENCES)]')
        else query.push('body.peek[HEADER.FIELDS (REFERENCES)]')
      }
    }

    const options:any = { byUid: true }
    if (modseq) options.changedSince = modseq

    this.Log.log("Fetching via IMAP...")

    let messages = await this.client.listMessages(
      path, sequence, query, options
    ).catch(this.Log.error)
    if (!messages) return []

    //? if we exceed the limit, deal with the newest messages
    if (limit && messages.length > limit) messages = messages.slice(messages.length - limit)

    //? if the messages have a content key and we want to parse run mailparser
    if (content_key && parse) {
      this.Log.log(path, "| Parsing", sequence)

      const parsed_messages = await batchMap<any, EmailRaw>(messages, 500, async (message: any): Promise<EmailRaw> => {
        message.parsed = await simpleParser(message[content_key], {
          skipHtmlToText: true,
          skipTextToHtml: true,
          maxHtmlLengthToParse: 100 * 1000,
          skipAttachments: !attachments,
          keepCidLinks: cids
        })
        message.parsed.textAsHtml = ''
        if (!attachments) {
          message.parsed.attachments = (message.parsed.attachments || []).map((attachment: AttachmentRaw) => {
            if (attachment?.contentType && !(attachment.contentType.includes('aiko/'))) attachment.content = undefined
            return attachment
          })
        }
        delete message[content_key]
        let cache: any[] = []
        const tmp = JSON.stringify(message, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) return
            cache.push(value)
          }
          return value
        })
        cache = []
        return JSON.parse(tmp) as EmailRaw
      })

      this.Log.success(path, "| Parsed", sequence)
      return parsed_messages as EmailRaw[]
    }

    if (flags && envelope) return messages as EmailRawWithEnvelope[]
    if (flags) return messages as EmailRawWithFlags[]
    return messages as EmailRawBase[]
  }

  async listMessagesWithFlags(path: string, sequence: string, {
    modseq='',
    limit=null
  }: {
    modseq?: string | number, //? change-based fetching
    limit?: number | null //? impose a maximum number of emails to fetch
  } ={}): Promise<EmailRawWithFlags[]> {
    return await this.listMessages(path, sequence, {
      flags: true, envelope: false,
      modseq, limit
    }) as EmailRawWithFlags[]
  }

  async listMessagesWithEnvelopes(path: string, sequence: string, {
    modseq='',
    limit=null
  }: {
    modseq?: string | number, //? change-based fetching
    limit?: number | null //? impose a maximum number of emails to fetch
  } ={}): Promise<EmailRawWithEnvelope[]> {
    return await this.listMessages(path, sequence, {
      flags: true, envelope: true,
      modseq, limit
    }) as EmailRawWithEnvelope[]
  }

  async listMessagesWithHeaders(path: string, sequence: string, {
    parse=true,
    markAsSeen=false,
    modseq='',
    limit=null
  }: {
    parse?: boolean, //? whether to parse the content
    markAsSeen?: boolean, //? whether to mark the email as seen when fetching
    modseq?: string | number, //? change-based fetching
    limit?: number | null //? impose a maximum number of emails to fetch
  } ={}): Promise<EmailRawWithHeaders[]> {
    return await this.listMessages(path, sequence, {
      flags: true, envelope: true, markAsSeen,
      headers: true, parse,
      modseq, limit
    }) as EmailRawWithHeaders[]
  }

  async listMessagesFull(path: string, sequence: string, {
    bodystructure=true,
    parse=true,
    markAsSeen=false,
    attachments=false,
    cids=false,
    modseq='',
    limit=null
  }: {
    bodystructure?: boolean, //? whether to fetch the bodystructure
    parse?: boolean, //? whether to parse the content
    markAsSeen?: boolean, //? whether to mark the email as seen when fetching
    attachments?: boolean, //? whether to download attachment content
    cids?: boolean, //? whether to keep the inline attachments as CIDs or populate them
    modseq?: string | number, //? change-based fetching
    limit?: number | null //? impose a maximum number of emails to fetch
  } ={}): Promise<EmailRaw[]> {
    return await this.listMessages(path, sequence, {
      flags: true, envelope: true, markAsSeen,
      headers: true, content: true, parse,
      cids, attachments, bodystructure,
      modseq, limit
    }) as EmailRaw[]
  }

  /**
   * Searches messages using a query and returns a list of matching UIDs
   * @param {string} path - the folder you're searching
   * @param {SearchQuery} query - a SearchQuery object to compile into a search query
   * @returns a list of number UIDs that match the query
   */
  async searchMessages(path: string, query: SearchQuery): Promise<number[]> {
    if (!this.client) await this.connect()
    const q: SearchQueryRaw = query.compile()
    this.Log.log("Searching", path, "with query", q)
    await this.openFolder(path) //? for sanity's sake
    const results:string[] | number[] = await this.client.search(path, q, {byUid: true})
    return results.map((x: string | number):number => +x)
  }

  async deleteMessages(path: string, sequence: string) {
    if (!this.client) await this.connect()
    if (sequence.startsWith('0')) return this.Log.error("Delete sequences cannot contain '0' as a startpoint.")
    this.Log.log("Deleting messages in", path)
    await this.client.deleteMessages(path, sequence, {byUid: true}).catch(this.Log.error)
    return this.Log.success("Deleted messages", path, sequence)
  }

  async flagMessages(path: string, sequence: string, flags: FlagsMod) {
    if (!this.client) await this.connect()
    if (sequence.startsWith('0')) return this.Log.error("Flag sequences cannot contain '0' as a startpoint.")
    this.Log.log("Flagging messages in", path)
    await this.client.setFlags(path, sequence, flags, {byUid: true, silent: true}).catch(this.Log.error)
    return this.Log.success("Set flags", flags, "for specified messages in", path)
  }

  async copyMessages(src: string, dst: string, sequence: string): Promise<CopyUID> {
    if (!this.client) await this.connect()
    if (sequence.startsWith('0')) {
      this.Log.error("Copy sequences cannot contain '0' as a startpoint.")
      return new CopyUID({})
    }
    this.Log.log("Copying messages from", src, "to", dst)
    const result: CopyUIDSetRaw | undefined = await this.client.copyMessages(src, sequence, dst, {byUid: true}).catch(this.Log.error)
    this.Log.success("(Probably) Copied messages from", src, "to", dst)
    if (!result) return new CopyUID({})
    else return new CopyUID(result)
  }

  async moveMessages(src: string, dst: string, sequence: string): Promise<MoveUID> {
    if (!this.client) await this.connect()
    if (sequence.startsWith('0')) {
      this.Log.error("Move sequences cannot contain '0' as a startpoint.")
      return new MoveUID({})
    }
    this.Log.log("Moving messages from", src, "to", dst)
    const result: CopyUIDSetRaw | undefined = await this.client.moveMessages(src, sequence, dst, {byUid: true}).catch(this.Log.error)
    this.Log.success("(Probably) Moved messages from", src, "to", dst)
    if (!result) return new MoveUID({})
    else return new MoveUID(result)
  }

  /** Inconsistent behaviour depending on mailserver. Highly recommended to avoid usage where possible. */
  async addMessage(path: string, message: any, flags:string[]=['\\Seen']) {
    if (!this.client) await this.connect()
    this.Log.warn("Adding messages. The behaviour of this method is not consistent.")
    await this.client.upload(path, message, { flags: flags }).catch(this.Log.error)
    return this.Log.success("(Probably) Uploaded message to", path)
  }

}