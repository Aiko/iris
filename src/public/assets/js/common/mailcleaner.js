const MailCleaner = (() => {

    const peek_clean = folder => (async email => {
        // just makes it easier to use in JS
        email.envelope.date = new Date(email.envelope.date)
        email.folder = folder
        email.syncing = false
        // NOTE: you need to define EVERYTHING
        // that you want vue to watch here beforehand!!!
        if (!email.ai) email.ai = {
            seen: false,
            starred: false,
            deleted: false,
            subscription: false,
            unsubscribeLink: '',
            summary: '',
            thread: false,
            threaded: false
        }
        if (email.flags.includes('\\Seen')) email.ai.seen = true
        if (email.flags.includes('\\Flagged')) email.ai.starred = true
        return email
    })

    const base_clean = folder => (async email => {
        email = await peek_clean(folder)(email)
        email.ai.subscription = false
        email.ai.unsubscribeLink = ''
        email.parsed.headerLines.map(({
            key,
            line
        }) => {
            if (key == 'list-unsubscribe') {
                const urls = line.match(/(http:\/\/|mailto:|https:\/\/)[^>]*/gim)
                if (urls && urls.length > 0) {
                    email.ai.subscription = true
                    email.ai.unsubscribeLink = urls[0]
                } else console.log("LIST-UNSUBSCRIBE", line)
            }
        })
        if (email.flags.includes('\\Seen')) email.ai.seen = true
        return email
    })

    const full_clean = folder => (async email => {
        email = await base_clean(folder)(email)
        email.ai.summary = "Coming Soon: SUMMARY"
        email.parsed.text = null
        email.parsed.html = null
        email.parsed.textAsHtml = null
        email.syncing = false
        email.dragging = false
        // TODO: do AI pieces
        return email
    })

    return {
        peek: async (folder, messages) => await Promise.all(messages.map(peek_clean(folder))),
        base: async (folder, messages) => await Promise.all(messages.map(base_clean(folder))),
        full: async (folder, messages) => await Promise.all(messages.map(full_clean(folder))),
    }
})()