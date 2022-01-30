import AikoAI from 'aikomail-sdk'
import { BabylonResult, BabylonScheduling, EnhancedBabylonResult } from 'aikomail-sdk/dist/ai/types'
import autoBind from 'auto-bind'
import { EmailParticipantRaw, EmailRaw, EmailRawBase, MessageID } from '../post-office/types'

export type CacheLevels = "L1" | "L2" | "L3" | "L3b" | "ATT"

//? Mouseion Types

export type MouseionFlags = {
  seen: boolean,
  deleted: boolean,
  starred: boolean
}

export interface EmailParticipantModel {
  name: string
  address: string
  base: string
}

export class EmailParticipant implements EmailParticipantModel {
  name: string
  address: string
  base: string
  constructor(participant: EmailParticipantRaw) {
    this.name = participant.name || "No Sender"
    this.address = participant.address || "hidden@"
    if (this.address != "hidden@" && this.name == "No Sender") this.name = this.address
    this.base = this.address.replace(/\+.*(?=@)/gim, '')
    autoBind(this)
  }
  static fromList(participants: EmailParticipantRaw[]) {
    return participants.map(participant => new EmailParticipant(participant))
  }
}

export interface MouseionEnvelope {
  mid: string
  uid: number
  folder: string
  date: Date
  subject: string
  cleanSubject: string
  from: EmailParticipant
  to: EmailParticipant[]
  cc: EmailParticipant[]
  bcc: EmailParticipant[]
  recipients: EmailParticipant[]
}

export interface MouseionSubscription {
  subscribed: boolean
  unsubscribe: string // URL
}

export type MouseionReferences = MessageID[]

export interface MouseionParsedBase {
  html: string
  text: string
  cleanText: string
  sentences: string[]
}

export interface MouseionSummary {
  sentences: string[]
  text: string
}

export interface MouseionQuickActions {
  results: Record<string, EnhancedBabylonResult>
  rawResults: any
  classification: string
  context: string
  overrideText?: string
  overrideIcon?: string
  scheduling: BabylonScheduling
  otp: string
}

export interface MouseionAIMeta {
  topics: {text: string, count: number}[]
}

export interface MouseionAttachment {
  filename: string
  contentType: string
  size: number
  content: {
    type: string,
    data: Buffer
  }
  cid: string
  related: boolean
  checksum: string
}

export interface MouseionParsed extends MouseionParsedBase {
  attachments: MouseionAttachment[]
}

export interface EmailBase {
  raw: EmailRawBase
  folder: string
  audit_log: string[]
  cache_location: CacheLevels
}

export interface MFlags {
  flags: MouseionFlags
}
// base flags envelope headers/references full/priority
export interface EmailWithFlags extends EmailBase {
  M: MFlags
  uid: number
}

export interface MEnvelope extends MFlags {
  envelope: MouseionEnvelope
}

export interface EmailWithEnvelope extends EmailWithFlags {
  M: MEnvelope
}

export interface MSubscription extends MEnvelope {
  subscription: MouseionSubscription
}

export interface EmailWithSubscription extends EmailWithEnvelope {
  M: MSubscription
}

export interface MReferences extends MSubscription {
  references: MouseionReferences
}

export interface EmailWithReferences extends EmailWithSubscription {
  M: MReferences
}

export interface EmailWithContent extends EmailWithReferences {
  parsed: MouseionParsedBase
}

export interface MSummary extends MReferences {
  summary: MouseionSummary
}

export interface EmailWithSummary extends EmailWithContent {
  M: MSummary
}

export interface MQuickActions extends MSummary {
  quick_actions: MouseionQuickActions
}

export interface EmailWithQA extends EmailWithSummary {
  M: MQuickActions
}

export interface MAIMetadata extends MQuickActions {
  ai_metadata: MouseionAIMeta
}

export interface EmailWithAIMeta extends EmailWithQA {
  M: MAIMetadata
}

export type MouseionLink = {text: string, href: string}

export interface MLinks extends MAIMetadata {
  links: MouseionLink[]
}

export interface EmailWithLinks extends EmailWithAIMeta {
  M: MLinks
}

export interface EmailWithAttachments extends EmailWithLinks {
  parsed: MouseionParsed
}

export interface MTracker extends MLinks {
  tracker: boolean
}

export interface EmailWithTrackers extends EmailWithAttachments {
  M: MTracker
}

export interface MPriority extends MTracker {
  priority: boolean
}

export interface EmailWithPriority extends EmailWithTrackers {
  M: MPriority
}

export interface EmailFull extends EmailWithPriority {

}

export const isEmailFull = (email: any):email is EmailFull => !!(email?.parsed?.attachments?.length > -1)