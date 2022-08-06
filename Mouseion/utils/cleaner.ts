const HTML2Text = require('html-to-text')
const jsdom = require('jsdom')
jsdom.defaultDocumentFeatures = {
  FetchExternalResources: false,
  ProcessExternalResources: false
}
const { JSDOM } = jsdom
//! TODO: needs timeouts on node fetch (something for aikomail-sdk)
const planer = require('planer')

//? Everything above is untyped as of now unfortunately

//? Typed aliases to planer
const Sift = {
  text: (text: string): string => planer.extractFrom(text, 'text/plain') as string,
  html: (html: string): string => {
    const dom = new JSDOM()
    return planer.extractFromHtml(html, dom.window.document) as string
  }
}

import Cheerio from 'cheerio'
import nlp from 'compromise'
import AikoAI from 'aikomail-sdk'
import { performance } from 'perf_hooks'
import { LumberjackEmployer, Logger } from './logger'
import Register from '../managers/register'
import {
  AttachmentRaw,
  EmailRaw,
  EmailRawBase,
  EmailRawWithEnvelope,
  EmailRawWithFlags,
  EmailRawWithHeaders
} from '../post-office/types'
import {
  EmailBase,
  EmailParticipant,
  EmailWithAIMeta,
  EmailWithAttachments,
  EmailWithContent,
  EmailWithEnvelope,
  EmailWithFlags,
  EmailWithLinks,
  EmailWithPriority,
  EmailWithQA,
  EmailWithReferences,
  EmailWithSubscription,
  EmailWithSummary,
  EmailWithTrackers,
  MouseionAttachment,
  MouseionEnvelope,
  MouseionFlags,
  MouseionLink,
  MouseionQuickActions,
  MouseionReferences,
  MouseionSubscription,
  MouseionSummary
} from './types'
import { isError } from 'aikomail-sdk/dist/ai/types'
import autoBind from 'auto-bind'

type runtime = { runs: number, time: number }

import commonActions from './common-actions'

export default class Janitor {
  private readonly Log: Logger
  private readonly folder: string
  private readonly useAiko: boolean = false
  private readonly runtimes: Record<string, runtime> = {}

  constructor(Registry: Register, { folder, useAiko = false }: { folder: string, useAiko?: boolean }) {
    const Lumberjack = Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Janitor')
    this.folder = folder
    this.useAiko = useAiko
    this.runtimes['content'] = { runs: 0, time: 0 }
    this.runtimes['summarizer'] = { runs: 0, time: 0 }
    this.runtimes['snips'] = { runs: 0, time: 0 }
    autoBind(this)
  }

  async base(email: EmailRawBase): Promise<EmailBase> {
    return {
      raw: email,
      folder: this.folder,
      audit_log: [],
      cache_location: "L1"
    }
  }

  async flags(email: EmailRawWithFlags): Promise<EmailWithFlags> {
    const e: EmailBase = await this.base(email)
    const d: MouseionFlags = {
      seen: email.flags.includes('\\Seen'),
      deleted: email.flags.includes('\\Deleted'),
      starred: email.flags.includes('\\Flagged')
    }
    return {
      ...e,
      uid: email.uid,
      M: {
        flags: d,
      }
    }
  }

  async envelope(email: EmailRawWithEnvelope): Promise<EmailWithEnvelope> {
    const e: EmailWithFlags = await this.flags(email)
    const date = new Date(email.envelope.date ?? '')
    const d: MouseionEnvelope = {
      mid: email.envelope['message-id'] ?? '',
      uid: email.uid,
      folder: e.folder,
      date,
      subject: email.envelope.subject ?? 'No Subject',
      cleanSubject: email.envelope.subject?.replace(/^((.external.|external:|re:|fw:|fwd:|aw:|wg:|undeliverable|undelivered|automatic reply):?\s*)+/gim, '') ?? '',
      from: new EmailParticipant(email.envelope.from?.[0] ?? email.envelope.sender?.[0] ?? { name: 'No sender', address: 'hidden@hidden' }),
      to: EmailParticipant.fromList(email.envelope.to ?? email.envelope.bcc ?? []),
      cc: EmailParticipant.fromList(email.envelope.cc ?? []),
      bcc: EmailParticipant.fromList(email.envelope.bcc ?? []),
      recipients: []
    }
    d.recipients.push(...d.to, ...d.cc, ...d.bcc)
    return {
      ...e,
      M: {
        ...e.M,
        envelope: d
      }
    }
  }

  private async subscription(email: EmailRawWithHeaders): Promise<EmailWithSubscription> {
    const e: EmailWithEnvelope = await this.envelope(email)
    const d: MouseionSubscription = {
      subscribed: false,
      unsubscribe: ''
    }
    email.parsed.headerLines?.map(h => {
      const { key, line } = h
      if (key == 'list-unsubscribe') {
        const urls = line.match(/(http:\/\/|mailto:|https:\/\/)[^>]*/gim)
        if (urls && urls.length > 0) {
          d.subscribed = true
          d.unsubscribe = urls[0]
        } else;// console.log('LIST-UNSUBSCRIBE', line)
      }
    })
    return {
      ...e,
      M: {
        ...e.M,
        subscription: d
      }
    }
  }

  private async references(email: EmailRawWithHeaders): Promise<EmailWithReferences> {
    const e: EmailWithSubscription = await this.subscription(email)

    const inReplyTo = email.envelope['in-reply-to']
    let references = email.parsed.references ?? []
    let refs: string[] = []
    if (typeof references === 'string') refs = references.split(/[, \t\r\n]+/gim)
    else refs = references
    if (inReplyTo && !references.includes(inReplyTo)) refs.unshift(inReplyTo)
    const d: MouseionReferences = [...refs]

    return {
      ...e,
      M: {
        ...e.M,
        references: d
      }
    }
  }

  private async content(email: EmailRaw): Promise<EmailWithContent> {
    const e: EmailWithReferences = await this.references(email)
    const t0 = performance.now()

    const html = email.parsed.html || email.parsed.text?.replace(/\\n/gim, '\n<br>')?.replace(/\n/gim, '\n<br>') || ''
    const text = email.parsed.text || (HTML2Text.fromString(email.parsed.html ?? '', {
      wordwrap: false,
      hideLinkHrefIfSameAsText: true,
      ignoreImage: true,
      unorderedListItemPrefix: ' - '
    }) as string) || ''

    //? remove quoted content, first using our shoddy regex then using Sift (which calls planer)
    const replyStarts = /On \w+ [0-9]+, [0-9]+, at [0-9]+:[0-9]+ \w+, \w+ <.*> wrote:/g.exec(text)
    const cleanText = text.slice(0, replyStarts?.index ?? text.length + 2)
    const cleanerText = Sift.text(text)

    //? split out sentences
    // TODO: this can prob be updated, the regex is from 2017...
    const sentences = cleanerText.replace(/(?!\w\.\w.)(?![A-Z][a-z]\.)(?:\.|!|\?|\n)\s/g, '$&AIKO-SPLIT-TOKEN').split(/AIKO-SPLIT-TOKEN/g)

    const t1 = performance.now()
    this.runtimes['content'].runs++
    this.runtimes['content'].time += t1 - t0

    return {
      ...e,
      parsed: {
        html, text,
        cleanText: cleanerText,
        sentences
      }
    }
  }

  private async deepSubscription(email: EmailRaw): Promise<EmailWithContent> {
    const e: EmailWithContent = await this.content(email)
    if (email.parsed.headers?.['list-unsubscribe'] || email.parsed.headers?.['list-id'] || (e.parsed.html || '').match(
      /unsubscribe|email ([^\.\?!]*)preferences|marketing preferences|opt( |-)*out|turn off([^\.\?!]*)email/gi
    )) {
      e.M.subscription.subscribed = true
      e.M.subscription.unsubscribe = email.parsed.headers?.['list-unsubscribe'] ?? ''
    }
    return e
  }

  private async summarize(email: EmailRaw): Promise<EmailWithSummary> {
    const e: EmailWithContent = await this.deepSubscription(email)
    const SUMMARY_LENGTH = (e.parsed.sentences.length > 7) ? 5 : 3 //? target num of sentences in summary
    const preview = e.parsed.sentences.filter(s => s.length < 300 && s.length > 16).slice(0, SUMMARY_LENGTH)
    let d: MouseionSummary = {
      sentences: preview,
      text: preview.join(' ')
    }

    if (!e.M.subscription.subscribed && this.useAiko) {
      const t0 = performance.now()
      const summary = await AikoAI.summarize(e.parsed.cleanText, SUMMARY_LENGTH).catch(this.Log.error)
      if (summary?.[0]) d = {
        sentences: summary,
        text: summary.join(' ')
      }
      const t1 = performance.now()
      this.runtimes['summarizer'].runs++
      this.runtimes['summarizer'].time += t1 - t0
    }

    if (d.sentences.length == 0) {
      d.sentences = e.parsed.sentences.slice(0, SUMMARY_LENGTH)
      d.text = d.sentences.join(' ')
    }

    return {
      ...e,
      M: {
        ...e.M,
        summary: d
      }
    }
  }

  private async snips(email: EmailRaw): Promise<EmailWithQA> {
    const e: EmailWithSummary = await this.summarize(email)
    const d: MouseionQuickActions = {
      rawResults: null,
      results: {},
      classification: '',
      context: 'got nothing back from quick actions',
      scheduling: {
        subject: '',
        start: null,
        end: null
      },
      otp: ''
    }

    const ret = () => ({
      ...e,
      M: {
        ...e.M,
        quick_actions: d
      }
    })

    if (e.M.subscription.subscribed || !this.useAiko) return ret()

    const t0 = performance.now()

    //? if you want to allow testing more of an email then enable the below
    /*
      let test_sentences = []
      const short_sentences = e.parsed.sentences.filter(s => s.length < 196 && s.length > 16)
      if (short_sentences.length <= 10) test_sentences.push(...short_sentences)
      else test_sentences.push(...(e.M.summary.sentences))
    */
    const test_sentences = [...(e.M.summary.sentences)]

    //? we skip choking sentences at this time
    //? instead, the choke dataset was included when developing the QA model

    const results = await AikoAI.quick_actions(test_sentences).catch(this.Log.error)
    if (!results) return ret()
    d.rawResults = JSON.parse(JSON.stringify(results))
    if (isError(results)) return ret()
    d.results = results

    //? we define an order of precedence for quick actions
    //* closer to end of array <=> higher precedence
    const intent_ranking = [
      'confirm_code',
      'send_document',
      'scheduling'
    ] // TODO: intent type in aikomail-sdk should be a union of string literals
    const Rank = (i: string) => i ? intent_ranking.indexOf(i) : -1

    //? determine the dominant quick action
    test_sentences.forEach(sentence => {
      const result = results[sentence]
      if (!result?.intent) return
      if (result.confidence < 0.5) return

      //? Rule #1: only update classification if intent (not-strictly) outranks current intent
      //? Rule #2: Aggregate knowledge on sentences w/ same intent, later takes precedence
      if (Rank(result.intent) >= Rank(d.classification)) {
        d.classification = result.intent
        d.context = result.context

        if (result.intent == 'scheduling' && result.scheduling) {
          d.scheduling.subject = d.scheduling.subject ?? result.scheduling.subject
          d.scheduling.start = d.scheduling.start ?? result.scheduling.start
          d.scheduling.end = d.scheduling.end ?? result.scheduling.end
        }

        if (result.intent == 'confirm_code' && !d.otp) {
          let code = result.entities.filter(entity => entity.subtype == 'code')?.[0]?.value ?? ''

          if (!code) code = /\b[0-9A-Z]{5,12}\b/g.exec(e.parsed.text)?.[0] || ''

          if (code) {
            code = code.trim()
            if (/\b/.test(code)) {
              const maybeCode = code.split(/\b/gim).filter(fragment => /^[0-9A-Z]{4,20}$/.test(fragment))?.[0] || ''
              if (maybeCode) code = maybeCode
            }
            d.otp = code
          }

        }
      }
    })

    const t1 = performance.now()
    this.runtimes['snips'].runs++
    this.runtimes['snips'].time += t1 - t0

    return {
      ...e,
      M: {
        ...e.M,
        quick_actions: d
      }
    }
  }

  private async compromise(email: EmailRaw): Promise<EmailWithAIMeta> {
    const e: EmailWithQA = await this.snips(email)

    const doc = nlp([
      e.M.envelope.cleanSubject,
      e.parsed.cleanText //* can change this back to e.parsed.text to include quoted materials
    ].join(' \n '))
    const topics: {text: string, count: number}[] = doc.nouns().normalize({
      possessives: true,
      plurals: true,
    }).unique().sort('freq').json({
      count: true,
      normal: true,
      reduced: true,
      unique: true
    })
    const top_topics = topics.slice(0, 50)

    return {
      ...e,
      M: {
        ...e.M,
        ai_metadata: {
          topics: top_topics
        }
      }
    }
  }

  private async links(email: EmailRaw): Promise<EmailWithLinks> {
    const e: EmailWithAIMeta = await this.compromise(email)

    const $ = Cheerio.load(e.parsed.html)
    const links: MouseionLink[] = []
    const rich_actions: any[] = []
    $('a').each(function () {
      const href = $(this).attr('href') ?? ''
      const text = $(this).text() ?? ''
      if (href) links.push({ href, text })
    })
    const maybeParse = (t: string) => {
      try {
        return JSON.parse(t)
      } catch {
        return null
      }
    }
    $('script').each(function () {
      const type = $(this).attr('type') ?? ''
      if (!type.includes('ld+json')) return;
      const def = maybeParse($(this).html() ?? 'null')
      if (def) rich_actions.push(def)
    })


    //? link intents will always override ai intents
    //? this is intended, ai intents are x% confidence, link intents are guarantees
    //? precedence is indicated by order in code, actual link will be stored in `context` property

    const subscribe_links = links.filter(({ text }) => text.match(/(\bsubscribe .*)/gi)).map(({ href }) => href)
    if (subscribe_links.length > 0) {
      e.M.quick_actions.context = subscribe_links[0]
      e.M.quick_actions.classification = 'subscribe'
    }

    const unsubscribe_links = links.filter(({ href }) => href.includes('unsubscribe'))
    //? context will be null if it can't find an unsubscribe link/email
    if (e.M.subscription.subscribed) {
      e.M.quick_actions.classification = 'unsubscribe'
      if (!e.M.subscription.unsubscribe && unsubscribe_links.length > 0) {
        e.M.subscription.unsubscribe = unsubscribe_links[0].href
      }
      e.M.quick_actions.context = e.M.subscription.unsubscribe?.replace(/<|>/g, '')
    } else if (unsubscribe_links.length > 0) {
      e.M.quick_actions.classification = 'unsubscribe'
      e.M.subscription.subscribed = true
      e.M.subscription.unsubscribe = unsubscribe_links[0].href
      e.M.quick_actions.context = e.M.subscription.unsubscribe
    }

    const verify_links = links.filter(({ text, href }) =>
      text.match(/(verify|confirm)/gi) || href.match(/verify/gi)
    ).map(({ href }) => href)
    if (verify_links.length > 0) {
      e.M.quick_actions.context = verify_links[0]
      e.M.quick_actions.classification = 'verify'
    }

    const commonActionHrefs = Object.keys(commonActions)
    const common_action_links = links.map(({ text, href }) => {
      for (const commonActionHref of commonActionHrefs) {
        if (href.includes(commonActionHref.toLowerCase())) return {text, href, commonActionHref}
      }
      return null
    }).filter(_ => _).sort((a, b) =>
      commonActions[b!.commonActionHref].priority - commonActions[a!.commonActionHref].priority)
    if (common_action_links.length > 0) {
      e.M.quick_actions.context = common_action_links[0]!.href
      e.M.quick_actions.overrideText = commonActions[common_action_links[0]!.commonActionHref].text
      e.M.quick_actions.overrideIcon = "assets/icons/link.svg" // TODO: customize this later
      e.M.quick_actions.classification = 'override'
    }

    if (rich_actions.length > 0) {
      e.M.quick_actions.context = JSON.stringify(rich_actions)
      e.M.quick_actions.overrideText = "SPECIAL ACTION"
      e.M.quick_actions.overrideIcon = "assets/icons/link.svg" // TODO: customize this later
      e.M.quick_actions.classification = 'override'
    }

    return {
      ...e,
      M: {
        ...e.M,
        links
      }
    }
  }

  private async attachments(email: EmailRaw): Promise<EmailWithAttachments> {
    const e: EmailWithLinks = await this.links(email)

    const raw_attachments: AttachmentRaw[] = email.parsed.attachments || []
    const attachments: MouseionAttachment[] = raw_attachments.map((attachment: AttachmentRaw): MouseionAttachment => {
      let filename = attachment.filename ?? attachment.fileName ?? ""
      if (!filename && attachment?.contentType && attachment?.contentType?.includes('text/calendar'))
        filename = 'event.ics'
      ;;

      const testContentType = (contentType?: string) => {
        if (!contentType) return true;
        const bad = [
          'x-amp',
          'x-apple-asn1',
          'x-apple-pkcs12',
          'x-apple-pkcs7-certificates',
          'x-apple-pkcs7-certreqresp',
          'x-apple-pkcs7-mime',
          'x-apple-pkcs7-signature',
          'x-apple-secure-notes',
          'x-apple-secure-notes-enc',
          'x-apple-secure-notes-sig',
          'signature',
          'x-pkcs7',
          'x-x509'
        ]
        for (const badType of bad) {
          if (contentType.includes(badType)) return true
        }
        return false;
      }

      return {
        filename: filename ?? 'No Name.raw',
        contentType: attachment.contentType ?? '',
        size: attachment.size ?? 0,
        content: attachment.content ?? {
          data: Buffer.from([]),
          type: ""
        },
        cid: attachment.cid ?? '',
        related: (attachment.related || testContentType(attachment.contentType)) ?? false,
        checksum: attachment.checksum ?? ''
      }
    })

    const cal_invites: string[] = attachments.map(_ => _.filename).filter(fn => fn.endsWith('.ics'))
    if (cal_invites.length > 0) {
      e.M.quick_actions.classification = 'calendar_invite'
      e.M.quick_actions.context = cal_invites?.[0]
    }

    return {
      ...e,
      parsed: {
        ...e.parsed,
        attachments
      }
    }
  }

  private async trackers(email: EmailRaw): Promise<EmailWithTrackers> {
    const e: EmailWithAttachments = await this.attachments(email)

    let tracker = false

    // TODO: sync this list with a hosted one on our servers
    const tracker_terms = [
      'pixel.gif',
      'track/open'
    ]
    for (const tracker_term of tracker_terms) {
      if (e.parsed.html.includes(tracker_term)) {
        tracker = true
        break;;
      }
    }

    return {
      ...e,
      M: {
        ...e.M,
        tracker
      }
    }
  }

  private async priority(email: EmailRaw): Promise<EmailWithPriority> {
    const e: EmailWithTrackers = await this.trackers(email)
    const priority = !e.M.subscription.subscribed || e.M.flags.starred
    return {
      ...e,
      M: {
        ...e.M,
        priority
      }
    }
  }

  //? method aliases
  readonly headers = this.references.bind(this)
  readonly full = this.priority.bind(this)

  //? JSON storage turns certain objects into strings
  //? you can coerce the type to EmailWithEnvelope to use it, just call this storage method to fix bindings
  static storage<T extends EmailWithEnvelope>(email: T): T {
    email.M.envelope.date = new Date(email.M.envelope.date)
    return email
  }

  //? Logs metrics for all timed methods
  //! Take note these appear in saved logs as well as it does not use .time and .timeEnd
  metrics() {
    for (const key in this.runtimes) {
      const { runs, time } = this.runtimes[key]
      const avg_duration = time / runs
      this.Log.log("Metrics for", key, ":", runs, "runs,", avg_duration, "ms per run")
    }
  }

}