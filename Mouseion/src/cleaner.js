const HTML2Text = require('html-to-text')
const Cheerio = require('cheerio')
//! TODO: needs timeouts on node fetch (something for aikomail-sdk)
const AikoAI = require('aikomail-sdk')


//! TODO: upgrade to node v15 and replace polyfill below with performance module
const performance = {
  now: () => new Date().getTime()
}

const Janitor = (async (Lumberjack, folder, useAiko=false) => {
  const Log = Lumberjack('Janitor')

  //! ALL LAYERS ARE CUMULATIVE.
  const runtimes = {}

  //* All computed properties stored under the Mouseion property (.M)

  //* base layer for pipeline
  const base = async email => {
    if (!email) return Log.error("Can't clean a null email!")
    email.folder = folder
    email.M = {}
    return email
  }

  //* parse flags
  const flags = async email => {
    if (!email?.flags) return Log.error("Passed an email without flags into a flag pipeline.")
    email = await base(email)
    email.M.flags = {
      seen: email.flags.includes('\\Seen'),
      deleted: email.flags.includes('\\Deleted'),
      starred: email.flags.includes('\\Flagged'),
    }
    return email
  }

  //* parse envelope (requires envelope)
  const envelope = async email => {
    if (!email?.envelope) return Log.error("Passed an email without envelope into an envelope pipeline.")
    email = await flags(email)
    email.envelope.date = new Date(email.envelope.date)
    email.M.envelope = {
      mid: email.envelope?.['message-id'],
      uid: email.uid,
      folder: email.folder,
      date: email.envelope.date,
      subject: email.envelope.subject || 'No Subject',
      cleanSubject: email.envelope.subject?.replace(/^((re|fw|fwd|aw|wg|undeliverable|undelivered):\s*)+/gim, ''),
      from: email.envelope.from?.[0] || email.envelope.sender?.[0] || { name: 'No sender', address: 'hidden@hidden'  },
      to: email.envelope.to || [],
      cc: email.envelope.cc || [],
      bcc: email.envelope.bcc || [],
    }
    //? the base email is what should be used for auto board-rule creation
    email.M.envelope.from.base = email.M.envelope.from.address?.replace(/\+.*(?=@)/gim, '')
    return email
  }

  //* checks if email is subscription (requires parsed headers)
  const subscription = async email => {
    if (!email?.parsed) return Log.error("Passed an unparsed email into a parsed pipeline.")
    email = await envelope(email)

    email.M.subscription = {
      subscribed: false,
      unsubscribe: '',
    }

    email.parsed.headerLines.map(({key, line}) => {
      if (key == 'list-unsubscribe') {
        const urls = line.match(/(http:\/\/|mailto:|https:\/\/)[^>]*/gim)
        if (urls && urls.length > 0) {
          email.M.subscription.subscribed = true
          email.M.subscription.unsubscribe = urls[0]
        } else ;// console.log('LIST-UNSUBSCRIBE', line)
      }
    })

    return email
  }

  const references = async email => {
    email = await subscription(email)

    const inReplyTo = email.envelope?.['in-reply-to']
    let references = email.parsed?.references || []
    if (typeof references == 'string') references = references.split(/[, \t\r\n]+/gim)
    if (inReplyTo && !references.includes(inReplyTo)) references.unshift(inReplyTo)
    email.M.references = [...references]

    return email
  }

  //* cleans the parsed html and text content (requires parsed html/text)
  runtimes['content'] = {
    runs: 0, time: 0
  }
  const content = async email => {
    email = await references(email)
    const t0 = performance.now()
    //* generate html from text if needed
    if (!email.parsed.html) email.parsed.html = email.parsed.text?.replace(/\\n/gim, '<br>') || ''
    //* generate text from html if needed
    if (!email.parsed.text) email.parsed.text = HTML2Text.fromString(email.parsed.html || '', {
      wordwrap: false,
      hideLinkHrefIfSameAsText: true,
      ignoreImage: true,
      unorderedListItemPrefix: ' - '
    })
    //? possibly should use text from html below because normal text can contain bad messages
    //* remove the replies
    const replyStarts = /On \w+ [0-9]+, [0-9]+, at [0-9]+:[0-9]+ \w+, \w+ <.*> wrote:/g.exec(email.parsed.text)
    email.parsed.cleanText = email.parsed.text.slice(0, replyStarts?.index || email.parsed.text.length + 2)
    //* segment into sentences
    const sentences = email.parsed.cleanText.replace(/(?!\w\.\w.)(?![A-Z][a-z]\.)(?:\.|!|\?)\s/g, '$&AIKO-SPLIT-TOKEN').split(/AIKO-SPLIT-TOKEN/g)
    email.parsed.sentences = sentences
    const t1 = performance.now()
    runtimes['content'].runs++
    runtimes['content'].time += t1 - t0
    return email
  }

  //* checks deeper for subscriptions
  const deepSubscription = async email => {
    email = await content(email)
    if (email.parsed.headers['list-unsubscribe'] || email.parsed.headers['list-id'] || email.parsed.html.match(
      /unsubscribe|email ([^\.\?!]*)preferences|marketing preferences|opt( |-)*out|turn off([^\.\?!]*)email/gi
    )) {
      email.M.subscription.subscribed = true
      email.M.subscription.unsubscribe = email.parsed.headers['list-unsubscribe'] || ''
    }
    return email
  }

  //* runs the summarizer
  runtimes['summarizer'] = {
    runs: 0, time: 0
  }
  const summarize = async email => {
    email = await deepSubscription(email)

    //? subscriptions do not get summarized at this time
    email.M.summary = {
      sentences: email.parsed.sentences.filter(s => s.length < 196 && s.length > 16).slice(0, 3),
      text: email.parsed.sentences.filter(s => s.length < 196 && s.length > 16).slice(0, 3).join(' ')
    }
    if (!email.M.subscription.subscribed && useAiko) {
      const t0 = performance.now()
      const summary = await AikoAI.summarize(email.parsed.cleanText, 3).catch(_ => false)
      if (summary?.[0]) email.M.summary = {
        sentences: summary,
        text: summary.join(' ')
      }
      const t1 = performance.now()
      runtimes['summarizer'].runs++
      runtimes['summarizer'].time += t1 - t0
    }

    return email
  }

  //* runs intent recognizer
  runtimes['snips'] = {
    runs: 0, time: 0
  }
  const snips = async email => {
    email = await summarize(email)

    email.M.quick_actions = {
      results: [],
      classification: '',
      context: '',
      scheduling: {
        subject: '',
        start: null,
        end: null
      },
      otp: null
    }
    if (email.M.subscription.subscribed || !useAiko) return email

    const t0 = performance.now()
    //* first we define a set of sentences to test
    /* //? if you want to allow testing more of an email then enable the below
      let test_sentences = []
      const short_sentences = email.parsed.sentences.filter(s => s.length < 196 && s.length > 16)
      if (short_sentences.length <= 15) test_sentences.push(...short_sentences)
      else test_sentences.push(...(email.M.summary.sentences))
    */

    const test_sentences = [...(email.M.summary.sentences)]

    //? we skip choking sentences at this time
    //? instead, the choked sentences were included in the new model

    //* next we classify their intents
    const results = await AikoAI.quick_actions(test_sentences).catch(Log.error)
    if (!results) return email
    email.M.quick_actions.results = results

    //? we define an order of precedence for quick actions
    //* closer to end of array <=> higher precedence
    const intent_ranking = [
      'confirm_code', // ai based
      'send_document', // ai based
      'scheduling' // ai based
    ]
    const Rank = i => i ? intent_ranking.indexOf(i) : -1

    //* iterate over sentence results
    test_sentences.map(sentence => {
      const result = results[sentence]
      if (!result?.intent) return
      //* only update classification if intent outranks current intent
      //? >= because there might be multiple sentences w/ same intent with partial information
      //? so we should build up our knowledge based on all sentences w/ same intent
      if (Rank(result.intent) >= Rank(email.M.quick_actions.classification)) {
        email.M.quick_actions.classification = result.intent
        email.M.quick_actions.context = result.context

        //* in the special case of scheduling, assign relevant values
        if (result.intent == 'scheduling') {
          if (!email.M.quick_actions.scheduling.subject)
            email.M.quick_actions.scheduling.subject = result.subject
          if (!email.M.quick_actions.scheduling.start)
            email.M.quick_actions.scheduling.start = result.start
          if (!email.M.quick_actions.scheduling.end)
            email.M.quick_actions.scheduling.end = result.end
        }

        //* in the special case of confirm_code, look for the confirmation code
        if (result.intent == 'confirm_code' && !email.M.quick_actions.otp) {
          let code = result.entities.filter(({ subtype }) => subtype == "code")?.[0]?.value
          if (!code) code = /[0-9]{6}/g.exec(email.parsed.text)?.[0]
          if (code) email.M.quick_actions.otp = code
        }
      }
    })

    const t1 = performance.now()
    runtimes['snips'].runs++
    runtimes['snips'].time += t1 - t0

    return email
  }

  //* parses link based intents
  const links = async email => {
    email = await snips(email)

    const $ = Cheerio.load(email.parsed.html)
    const links = []
    $('a').each(function () {
      const href = $(this).attr('href')
      const text = $(this).text() || ''
      if (href) links.push({ href, text })
    })

    //? link intents will always override ai intents
    //? this is intended, ai intents are x% confidence, link intents are guarantees

    //? precedence is indicated by order in code, actual link will be stored in `context` property

    const subscribe_links = links.filter(({ text }) => text.match(/(\bsubscribe .*)/gi)).map(({ href }) => href)
    if (subscribe_links.length > 0) {
      email.M.quick_actions.context = subscribe_links[0]
      email.M.quick_actions.classification = 'subscribe'
    }

    const unsubscribe_links = links.filter(link => link.href.includes('unsubscribe'))
    //? the context will be null if it can't find an unsubscribe link/email
    if (email.M.subscription.subscribed) {
      email.M.quick_actions.classification = 'unsubscribe'
      if (!email.M.subscription.unsubscribe) {
        email.M.subscription.unsubscribe = unsubscribe_links?.[0]?.href
      }
      email.M.quick_actions.context = email.M.subscription.unsubscribe?.replace(/<|>/g, '')
    } else if (unsubscribe_links.length > 0) {
      email.M.quick_actions.classification = 'unsubscribe'
      email.M.subscription.subscribed = true
      email.M.subscription.unsubscribe = unsubscribe_links?.[0]?.href
      email.M.quick_actions.context = email.M.subscription.unsubscribe
    }

    const verify_links = links.filter(({ text, href }) =>
      text.match(/(verify|confirm)/gi) || href.match(/verify/gi)
    ).map(({ href }) => href)
    if (verify_links.length > 0) {
      email.M.quick_actions.context = verify_links[0]
      email.M.quick_actions.classification = 'verify'
    }

    return email
  }

  //* parses attachment intents
  const attachments = async email => {
    email = await links(email)

    //? attachment intents override link and ai intents
    //? this is also intended, as they have stronger intent indication than links
    email.parsed.attachments = email.parsed.attachments || []
    const cal_invites = email.parsed.attachments.map(_ => _.filename || _.fileName).filter(fn => fn?.endsWith('.ics'))
    if (cal_invites.length > 0) {
      email.M.quick_actions.classification = 'calendar_invite'
      email.M.quick_actions.context = cal_invites?.[0]
    }

    return email
  }

  //* check for trackers
  const trackers = async email => {
    email = await attachments(email)

    email.M.tracker = false

    // TODO: sync this list with a hosted one on our servers
    const tracker_terms = [
      'pixel.gif',
      'track/open'
    ]

    for (const tracker_term of tracker_terms) {
      if (email.parsed.html.includes(tracker_term)) {
        email.M.tracker = true
        break;
      }
    }

    return email
  }

  //* computes priority directive
  const priority = async email => {
    email = await trackers(email)
    email.M.priority = !email.M.subscription.subscribed || email.M.flags.starred
    return email
  }

  return {
    base, flags, envelope,
    headers: references,
    full: priority,
    storage: email => {
      email.M.envelope.date = new Date(email.M.envelope.date)
      return email
    },
    metrics: () => {
      for (key in runtimes) {
        const { runs, time } = runtimes[key]
        const avg_duration = time / runs
        Log.log("Metrics for", key, ":", runs, "runs,", avg_duration, "ms per run")
      }
    }
  }
})

module.exports = Janitor