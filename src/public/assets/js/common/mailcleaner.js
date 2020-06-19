const MailCleaner = (() => {
  const peek_clean = folder => async email => {
    // just makes it easier to use in JS
    email.envelope.date = new Date(email.envelope.date)
    email.folder = folder
    email.syncing = false
    // NOTE: you need to define EVERYTHING
    // that you want vue to watch here beforehand!!!
    if (!email.ai) {
      email.ai = {
        seen: false,
        starred: false,
        deleted: false,
        tracker: false,
        subscription: false,
        links: {
          subscribe: '',
          unsubscribe: '',
          verify: '',
          calendar: null,
          debug: []
        },
        summary: {
          sentences: [],
          text: ''
        },
        intents: {
          subscribe: false,
          verify: false,
          calendar: false,
          intent: {},
          main: null,
          scheduling: false
        },
        classification: [],
        thread: false,
        threaded: false
      }
    }
    if (email.flags.includes('\\Seen')) email.ai.seen = true
    if (email.flags.includes('\\Flagged')) email.ai.starred = true
    return email
  }

  const base_clean = folder => async email => {
    email = await peek_clean(folder)(email)
    email.ai.subscription = false
    email.ai.links.subscribe = ''
    email.parsed.headerLines.map(({
      key,
      line
    }) => {
      if (key == 'list-unsubscribe') {
        const urls = line.match(/(http:\/\/|mailto:|https:\/\/)[^>]*/gim)
        if (urls && urls.length > 0) {
          email.ai.subscription = true
          email.ai.links.subscribe = urls[0]
        } else ;//console.log('LIST-UNSUBSCRIBE', line)
      }
    })
    if (email.flags.includes('\\Seen')) email.ai.seen = true
    return email
  }

  const full_clean = (folder, ai = true) => async email => {
    //console.time('FULL CLEAN ' + email.uid)
    email = await base_clean(folder)(email)
    email.syncing = false
    email.dragging = false

    if (!email.parsed) throw 'Only handles parsed emails.'

    //* make sure there's always HTML and text
    if (!email.parsed.html) email.parsed.html = email.parsed.text || ''
    if (!email.parsed.text) email.parsed.text = HTML2Text(email.parsed.html) || ''

    //* check for subscriptions
    if (
      email.parsed.headers['list-unsubscribe'] ||
            email.parsed.headers['list-id'] ||
            email.parsed.html.match(
              /unsubscribe|email ([^\.\?!]*)preferences|marketing preferences|opt( |-)*out|turn off([^\.\?!]*)email/gi
            )
    ) {
      email.ai.subscription = true
    }

    //* parse HTML as DOM
    const parser = new DOMParser()
    const DOM = parser.parseFromString(email.parsed.html, 'text/html')

    //* get links
    const links = Array.from(DOM.getElementsByTagName('a'))
    email.ai.links.debug = links

    //* look for the "subscribe" quick action
    const subLinks = links.filter(link => link.innerText.match(/(\bsubscribe .*)/gi)).map(link => link.href).filter(_ => _)
    if (subLinks.length > 0) {
      email.ai.links.subscribe = subLinks[0]
      email.ai.intents.subscribe = true
      email.ai.intents.main = 'subscribe'
    }

    //* look for the "verify" quick action
    const verifyLinks = links.filter(link => link.innerText.match(/(verify|confirm)/gi) || (link.href && link.href.match(/verify/gi))).map(link => link.href).filter(_ => _)
    if (verifyLinks.length > 0) {
      email.ai.links.verify = verifyLinks[0]
      email.ai.intents.verify = true
      email.ai.intents.main = 'verify'
    }

    //* look for calendar invites
    if (email.parsed.attachments) {
      const cal_invites = email.parsed.attachments.map(attachment => attachment.fileName).filter(fn => fn?.endsWith('.ics'))
      if (cal_invites.length > 0) {
        email.ai.intents.calendar = true
        email.ai.links.calendar = cal_invite
        email.ai.intents.main = 'calendar'
      }
    }

    //* get all the sentences of the most recent message in the thread
    const replyStarts = /On \w+ [0-9]+, [0-9]+, at [0-9]+:[0-9]+ \w+, \w+ <.*> wrote:/g.exec(email.parsed.text)
    email.parsed.msgText = email.parsed.text.slice(0, replyStarts ? replyStarts.index : email.parsed.text.length + 2)
    const sentences = email.parsed.msgText.replace(/(?!\w\.\w.)(?![A-Z][a-z]\.)(?:\.|!|\?)\s/g, '$&AIKO-SPLIT').split(/AIKO-SPLIT/g)

    //* summarize email text
    if (ai) {
      // console.time("SUMMARIZING " + email.uid + " of " + email.folder)
      const summary = await AICore.summarize(email.parsed.text, 3)
      // console.timeEnd("SUMMARIZING " + email.uid + " of " + email.folder)
      if (summary) {
        email.ai.summary = {
          sentences: summary,
          text: summary.join(' ')
        }
      } else {
        email.ai.summary = {
          sentences: sentences.slice(0, 3),
          text: sentences.slice(0, 3).join(' ')
        }
      }
    } else {
      email.ai.summary = {
        sentences: sentences.slice(0, 3),
        text: sentences.slice(0, 3).join(' ')
      }
    }

    //* if it's going to the priority box let's run the AI on it
    // FIXME: this is disabled because the AI is offline!
    if (false && ai && !email.ai.subscription) {
      let to_test = sentences
      if (to_test.length > 15) to_test = email.ai.summary.sentences

      //* first we identify actionable sentences
      email.ai.actionables = await Promise.all(
        to_test.filter(
          async sentence => ((await AICore.choke(sentence)) > 0.4)
        )
      )

      //* then we classify their intents, sorting by confidence
      email.ai.classification = (
        await Promise.all(email.ai.actionables.map(AICore.intent))
      ).filter(_ => _).sort((a, b) => b.confidence - a.confidence)

      //* pick out intents that have time and confidence
      if (email.ai.classification.filter(e => e.time && e.confidence > 0.5).length > 0) { email.ai.intents.intent = email.ai.intents.filter(e => e.time)[0] }

      //* and whittle those down to a scheduling intent
      email.ai.intents.scheduling = (
                email.ai.classification?.length > 0 && email.ai.classification[0].type == 'Event'
      )
      if (email.ai.intents.scheduling) email.ai.intents.main = 'schedule'
    }

    //* if it's not a verification email try to show an unsubscribe button
    let unsubLink = email.parsed.headers?.['list-unsubscribe']
    const unsubLinks = links.filter(link => link.href.includes('unsubscribe'))
    if (unsubLinks?.length > 0) unsubLink = unsubLinks[0].href
    if (!email.ai.intents.verify && unsubLink) {
      email.ai.links.unsubscribe = unsubLink.replace(/<|>/g, '')
      email.ai.intents.main = 'unsubscribe'
    }

    //* indicate tracked emails
    if (
      email.parsed.html.indexOf('pixel.gif') > -1 ||
            email.parsed.html.indexOf('track/open') > -1
    ) email.ai.tracker = true

    email.parsed.text = null
    email.parsed.html = null
    email.parsed.textAsHtml = null

    // console.timeEnd("FULL CLEAN " + email.uid)
    return email
  }

  return {
    peek: async (folder, messages) => await Promise.all(messages.map(peek_clean(folder))),
    base: async (folder, messages) => await Promise.all(messages.map(base_clean(folder))),
    full: async (folder, messages, ai = true) => await Promise.all(messages.map(full_clean(folder, ai)))
  }
})()
