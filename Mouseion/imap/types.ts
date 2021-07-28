export interface FolderMetadata {
  delimiter: string
  path: string
  children: Record<string, FolderMetadata>
  flags: string[]
  listed: boolean
  subscribed: boolean
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

export interface EmailRawWithFlags extends EmailRawBase {
  flags: string[]
}

export interface EmailRawWithEnvelope extends EmailRawWithFlags {
  envelope: EmailWithEnvelopeRaw
}

export interface EmailRawWithHeaders extends EmailRawWithEnvelope {
  parsed: EmailParsedRaw
}

export interface EmailRaw extends EmailRawWithHeaders {

}