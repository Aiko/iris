const MailCleaner = (() => {

    const peek_clean = async email => {
        // just makes it easier to use in JS
        email.envelope.date = new Date(email.envelope.date)
        email.ai = {
            seen: false
        }
        if (email.flags.includes('\\Seen')) email.ai.seen = true
        return email
    }

    const base_clean = async email => {
        email = await peek_clean(email)
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
    }

    const full_clean = async email => {
        email = await base_clean(email)
        // TODO: do AI pieces
        return email
    }

    return {
        peek: async messages => await Promise.all(messages.map(peek_clean)),
        base: async messages => await Promise.all(messages.map(base_clean)),
        full: async messages => await Promise.all(messages.map(full_clean)),
    }
})()