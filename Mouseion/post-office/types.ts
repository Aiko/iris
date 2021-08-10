export interface IMAPConfig {
  host?: string
  port?: number
  user?: string
  pass?: string
  oauth?: string
  secure?: boolean
}

export interface FolderMetadata {
  delimiter: string
  path: string
  children: Record<string, FolderMetadata>
  flags: string[]
  listed: boolean
  subscribed: boolean
}

export interface FolderDetails {
  exists: number
  flags: string[]
  permanentFlags: string[]
  readOnly: boolean
  uidValidity: number
  uidNext: number
  highestModseq?: string
}

//? Raw Message Types

export type MessageID = string

export type EmailParticipantRaw = {
  name?: string
  address?: string
}

export interface EmailWithEnvelopeRaw {
  date?: string
  subject?: string
  from?: EmailParticipantRaw[]
  sender?: EmailParticipantRaw[]
  "reply-to"?: EmailParticipantRaw[]
  to?: EmailParticipantRaw[]
  cc?: EmailParticipantRaw[]
  bcc?: EmailParticipantRaw[]
  "in-reply-to"?: MessageID
  "message-id"?: MessageID
}

export type HeaderLine = {
  key: string
  line: string
}

export type MailParserAddressValue = {
  name?: string
  address?: string
}

export type MailParserAddress = {
  html?: string
  text?: string
  value?: MailParserAddressValue[]
}

export interface AttachmentRaw {
  filename?: string
  fileName?: string
  contentType?: string
  contentDisposition?: string
  checksum?: string
  size?: number
  headers?: Map<string, string>
  content?: Buffer
  contentId?: string
  cid?: string
  related?: boolean
}

export interface EmailParsedRaw {
  headerLines?: HeaderLine[]
  references?: MessageID[] | string
  headers?: Record<string, string>
  subject?: string
  from?: MailParserAddress
  to?: MailParserAddress
  cc?: MailParserAddress
  bcc?: MailParserAddress
  "reply-to"?: MailParserAddress
  date?: Date
  messageId?: MessageID
  inReplyTo?: MessageID
  html?: string
  text?: string
  textAsHtml?: string
  attachments?: AttachmentRaw[]
}

export interface EmailRawBase {
  uid: number
}
export const isEmailRawBase = (e: any):e is EmailRawBase => {
  return (typeof e.uid === 'number')
}

export interface EmailRawWithFlags extends EmailRawBase {
  flags: string[]
}
export const isEmailRawWithFlags = (e: any):e is EmailRawWithFlags => {
  return (e.flags?.length && isEmailRawBase(e))
}
export interface EmailRawWithEnvelope extends EmailRawWithFlags {
  envelope: EmailWithEnvelopeRaw
}
export const isEmailRawWithEnvelope = (e: any):e is EmailRawWithEnvelope => {
  return (!!(e.envelope) && isEmailRawWithFlags(e))
}

export interface EmailRawWithHeaders extends EmailRawWithEnvelope {
  parsed: EmailParsedRaw
}
export const isEmailRawWithHeaders = (e: any):e is EmailRawWithHeaders => {
  return (!!(e.parsed) && isEmailRawWithEnvelope(e))
}

export interface EmailRaw extends EmailRawWithHeaders {

}
export const isEmailRaw = (e: any):e is EmailRaw => {
  return isEmailRawWithHeaders(e)
}

export type RawEmail = EmailRawBase | EmailRawWithFlags | EmailRawWithEnvelope | EmailRawWithHeaders | EmailRaw

//? search queries are AND by default
export interface SearchQueryRaw {
  unseen?: boolean
  keyword?: string
  header?: string[]
  seen?: boolean
  since?: Date
  or?: SearchQueryRaw
  not?: SearchQueryRaw
}

//? We don't support multi-keyword searches yet because behaviour is inconsistent
export class SearchQuery {
  private read: boolean | null = null
  private keyword: string | null = null
  private header: string[] | null = null
  private after: Date | null = null
  private or: SearchQuery | null = null
  private not: SearchQuery | null = null

  isRead(b: boolean) {
    if (this.read != null) console.log("Warning: overwriting existing search read-status.".yellow)
    this.read = b
  }
  term(s: string) {
    if (this.keyword != null) console.log("Warning: overwriting existing search term.".yellow)
    this.keyword = s
  }
  hasHeader(k: string, v: string) {
    if (this.header != null) console.log("Warning: overwriting existing header search.".yellow)
    this.header = [k, v]
  }
  oldest(d: Date) {
    if (this.after != null) console.log("Warning: overwriting existing search minimum date.".yellow)
    this.after = d
  }
  any(q: SearchQuery) {
    if (this.or != null) console.log("Warning: overwriting existing or query.".yellow)
    this.or = q
  }
  none(q: SearchQuery) {
    if (this.not != null) console.log("Warning: overwriting existing not query.".yellow)
    this.not = q
  }

  compile(): SearchQueryRaw {
    const q: SearchQueryRaw = {}

    if (this.read != null) {
      if (this.read) q.seen = true
      else q.unseen = true
    }
    if (this.keyword != null) q.keyword = this.keyword
    if (this.header != null) q.header = this.header
    if (this.after != null) q.since = this.after
    if (this.or != null) q.or = this.or.compile()
    if (this.not != null) q.not = this.not.compile()

    return q
  }

}
//? "set" basically means remove all flags and add new ones
export interface FlagsMod {
  set: string[],
  add: string[],
  remove: string[]
}

//? This is inconsistent but necessary so we try handling all common cases
//? However, we can only support copying a single UID
//? If you copied multiple messages DO NOT use the returned UID set
//? It will DEFINITELY be wrong in some way
export interface CopyUIDSetRaw {
  copyuid?: string | string[]
  OK?: any
  payload?: any
  destSeqSet?: CopyUIDSetRaw | string[] | string
}

/** Only supports copying 1 message. Do NOT try to rely on this when copying multiple messages. */
export class CopyUID {
  private _uid: number

  private static isArray(x: any):x is any[] {
    return !!(x.reduceRight)
  }

  private static getUID(c: CopyUIDSetRaw): number {
    if (c.copyuid) {
      if (typeof (c.copyuid) == "string") {
        return +c.copyuid
      } else {
        return +(c.copyuid.reduceRight(_ => _))
      }
    }

    if (c.destSeqSet) {
      if (typeof (c.destSeqSet) == "string") {
        return +c.destSeqSet
      } else if (CopyUID.isArray(c.destSeqSet)) {
        return +(c.destSeqSet.reduceRight(_ => _))
      } else {
        return CopyUID.getUID(c.destSeqSet)
      }
    }

    return +(c.OK?.[0]?.copyuid?.[2] || c.payload?.OK?.[0]?.copyuid?.[2] || -1)
  }

  constructor(c: CopyUIDSetRaw) {
    this._uid = CopyUID.getUID(c)
  }

  get uid():number | null {
    if (this._uid > 0) return this._uid
    else return null
  }

}

//? it's the same internally, we just have a new class to make it readable in code
/** Only supports moving 1 message. Do NOT try to rely on this when moving multiple messages. */
export class MoveUID extends CopyUID {}