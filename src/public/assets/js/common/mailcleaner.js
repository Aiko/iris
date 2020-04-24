const MailCleaner = (() => {

    const peek_clean = folder => (async email => {
        // just makes it easier to use in JS
        email.envelope.date = new Date(email.envelope.date)
        email.folder = folder
        email.ai = {
            seen: false
        }
        if (email.flags.includes('\\Seen')) email.ai.seen = true
        return email
    })

    const base_clean = folder => (async email => {
        email = await peek_clean(folder)(email)
        email.ai = {
            subscription: false,
            unsubscribeLink: '',
            seen: false
        }
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
        // TODO: do AI pieces
        return email
    })

    return {
        peek: async (folder, messages) => await Promise.all(messages.map(peek_clean(folder))),
        base: async (folder, messages) => await Promise.all(messages.map(base_clean(folder))),
        full: async (folder, messages) => await Promise.all(messages.map(full_clean(folder))),
    }
})()