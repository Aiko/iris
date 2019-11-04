const {
    remote
} = require('electron')
const {
    Mailbox,
    store,
    entry,
    platform,
    getWin,
    GOAuth,
    MSOauth,
    queueCache,
    Mailman
} = remote.require('./app.js')

const phrases = [
    "long time no talk",
    "long time no see",
    "how are you?",
    "how's everything?",
    "thanks for reaching out",
    "thank you for reaching out",
    "thanks for letting me know",
    "thank you for letting me know",
    "what's up?",
    "I won't be able to make it.",
    "sounds good to me",
    "looks good to me",
    "sounds like a plan",
    "great, sounds good",
    "great, that works with me",
    "I enjoyed our talk",
    "thanks for meeting with us",
    "thanks for all the help",
    "thanks for getting in touch",
    "hope all is well",
    "how was your week?",
    "how was your weekend?",
    "many thanks",
    "really excited to hear back from you",
    "looking forward to it",
    "looking forward to hearing back from you",
    "thank you for sending it over",
    "would love to connect",
    "apologies for getting back to you so late",
    "I'll be there",
    "let me know",
    "let me know if this works for you",
    "let me know if you need more information",
    "no worries",
    "I'll send it over shortly",
    "I'll send them over shortly",
    "working on it",
    "I was wondering",
    "I was wondering if",
    "I was wondering if you",
    "thanks for your help",
    "best,",
    "all the best,",
    "baby seals are amazing",
    "I'd love to",
    "I'd love to meet up",
    "I'd love to talk to you",
    "Cordialement",
    "Merci",
    "Bonjour",
    "Let's meet up"
].map(t => t.toLowerCase())

const electron_mixin = {
    computed: {
        isFullScreen() {
            return getWin().isFullScreen()
        }
    },
    methods: {
        async minimize() {
            getWin().minimize()
        },
        async maximize() {
            getWin().maximize()
        },
        async fullscreen() {
            getWin().setFullScreen(true)
        },
        async close() {
            getWin().close()
        }
    }
}

const ai_mixin = {
    methods: {
        async summarize(text, n=3) {
            const s = await fetch('https://api.helloaiko.com/email', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "text": text,
                    "num": n
                })
            })
            const d = await s.json()
            if (d.text && d.text.length > 0) return d.text
            else return null
        },
        async choke(sentence) {
            sentence = unescapeHTML(sentence)
            sentence = sentence.trim()
            sentence = sentence.replace(/[^A-z0-9\.!\?,;\- '"]/g, '')
            if (sentence.length < 10) return 0;
            const s = await fetch('https://bigbrain.helloaiko.com:4114/parse', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    "q": sentence,
                    "project": "actionable",
                    "model": "v4"
                })
            }).catch(console.error)
            const d = await s.json()
            if (!d) return 0
            let conf = 0
            d.intent_ranking.map(({name, confidence}) => {
                if ([
                    "meeting",
                    "scheduling",
                    "actionable"
                ].includes(name))
                    conf += confidence
            })
            return conf
        },
        async intent(sentence) {
            const og_sentence = sentence
            sentence = unescapeHTML(sentence)
            sentence = sentence.trim()
            sentence = sentence.replace(/[^A-z0-9\.!\?,;\ "]/g, '')
            if (sentence.length < 10) return 0;
            const s = await fetch('https://bigbrain.helloaiko.com:4114/parse', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    "q": sentence,
                    "project": "scheduler",
                    "model": "v4"
                })
            }).catch(console.error)
            const d = await s.json()
            if (!d) return null
            const intent = {}
            if (
                (d.intent.name == 'scheduling' || d.intent.name == 'meeting')
                && d.intent.confidence > 0.5
            ) {
                intent.type = 'Event'
                intent.confidence = d.intent.confidence
                intent.context = og_sentence
                const subjects = d.entities.filter(_ => _.entity == 'subject')
                if (subjects.length > 0) {
                    intent.subject = subjects[0]
                    if (intent.subject.value.trim().length < 3)
                        intent.subject = null
                }
                const times = d.entities.filter(_ => _.entity == 'time')
                if (times.length > 0) {
                    const time = times[0]
                    if (time.value.trim().length < 2) {
                        const possible_times = chrono.parse(sentence)
                        if (possible_times.length > 0) {
                            const knowledge = {}
                            possible_times.map(time => {
                                if (time.end) intent.endTime = time.end.date()
                                const keys = Object.keys(time.start.knownValues)
                                keys.map(key => knowledge[key] = time.start.knownValues[key])
                            })
                            if (knowledge.month) knowledge.month = knowledge.month - 1
                            if (!knowledge.day) knowledge.day = possible_times[0].start.impliedValues.day
                            if (!knowledge.month) knowledge.month = possible_times[0].start.impliedValues.month - 1
                            if (!knowledge.hour) knowledge.hour = possible_times[0].start.impliedValues.hour
                            if (!knowledge.minute) knowledge.minute = 0
                            if (!knowledge.year) knowledge.year = possible_times[0].start.impliesValues.year
                            const d = new Date(knowledge.year, knowledge.month, knowledge.day, knowledge.hour, knowledge.minute || 0)
                            intent.time = d
                            intent.friendlyTime = d.toLocaleTimeString('en-us', {
                                hour: 'numeric',
                                minute: '2-digit',
                                day: 'numeric',
                                month: 'numeric'
                            })
                        }
                    }
                }
                return intent
            }
            return null
        }
    }
}

const kanban_mixin = {
    methods: {
        changeInbox(event) {
            const { removed, added, moved } = event
            if (removed) {
                // inbox to board movement
                this.boardIds.add(removed.element.headers['message-id'])
            }
            if (added) {
                log("Movement from board to inbox.")
                this.boardIds.delete(added.element.headers['message-id'])
                (async () => {
                    await app.IMAP.select(added.element.board)
                    await app.IMAP.deleteMessages(added.element.headers.id)
                })()
                added.element.board = null
            }
            this.unreadCount = this.emails.filter(email => !email.headers.seen).length
            return true
        },
        changeBoard(board) {
            return event => {
                const { removed, added, moved } = event
                if (added) {
                    if (added.element.board) {
                        log("Movement between boards.")
                        if (added.element.board == 'Done')
                            log(app.IMAP.moveTo(
                                added.element.headers.id,
                                '"[Aiko Mail (DO NOT DELETE)]/Done"',
                                board.folder
                            ))
                        else
                            log(app.IMAP.moveTo(
                                added.element.headers.id,
                                added.element.board,
                                board.folder,
                            ))
                    }
                    else {
                        log("Movement from the inbox to board.")
                        log(app.IMAP.copyTo(
                            added.element.headers.id,
                            app.inboxFolder,
                            board.folder
                        ))
                    }
                    added.element.board = board.folder
                }
                board.unreadCount = board.emails.filter(email => !email.headers.seen).length
                return true
            }
        },
        changeDoneBoard(event) {
            const { removed, added, moved } = event
            if (added) {
                if (added.element.board) {
                    log("Movement from board to done.")
                    log(app.IMAP.moveTo(
                        added.element.headers.id,
                        added.element.board,
                        '"[Aiko Mail (DO NOT DELETE)]/Done"'
                    ))
                }
                else {
                    log("Movement from the inbox to done.")
                    log(app.IMAP.copyTo(
                        added.element.headers.id,
                        app.inboxFolder,
                        '"[Aiko Mail (DO NOT DELETE)]/Done"'
                    ))
                }
                added.element.board = 'Done'
            }
        }
/*
my notes:

need a way to identify the board somehow, because @change only passes the
added or removed element, not the board target

once that is done, we can do 3 conditionals:
- inbox to board movement: copy from inbox to board,
    add id to set of ids so we know not to show in inbox
- board to board movement: move from board 1 to board 2
- board to inbox movement: delete from board, remove id from set of ids

also: maybe get the max of ids in inbox instead of emails[0]
then we can allow the user to reorder the inbox as they see fit

also: you might want to switch to localstorage for the caching of the inbox.
this would allow us to cache like 1000 emails at once (which would be AWESOME)
versus the 50 as it is now to prevent big freezes

*/

    }
}

const composer_mixin = {
    data: {
        composerTo: '',
        composerToAutocompletions: [],
        composerSendTo: [],
        composerCC: '',
        composerCCAutocompletions: [],
        composerSendCC: [],
        composerBCC: '',
        composerBCCAutocompletions: [],
        composerSendBCC: [],
        composerMsgBuffer: '',
        composerLookahead: '',
        composerInReplyTo: null
    },
    methods: {
        async composerClear() {
            this.composerTo = ''
            this.composerToAutocompletions = []
            this.composerSendTo = []
            this.composerCC = ''
            this.composerCCAutocompletions = []
            this.composerSendCC = []
            this.composerBCC = ''
            this.composerBCCAutocompletions = []
            this.composerSendBCC = []
            this.composerMsgBuffer = ''
            this.composerLookahead = ''
            this.composerInReplyTo = null
            $('#composerTo').html('')
            $('#composerCC').html('')
            $('#composerBCC').html('')
            $('#composerSubject').html('')
            $('#composerMsg').html('')
        },
        async composerAutocompleteTo(e) {
            this.composerTo = e.target.innerText.split('\n').last()
            ;(async () => {
                if (app.composerTo.endsWith(',')) app.composerMakeTo(app.composerTo.slice(0, app.composerTo.length - 1));
                const contacts = Object.keys(app.mailbox.contacts || {})
                app.composerToAutocompletions = contacts.filter(contact => contact.startsWith(app.composerTo)).slice(0, 5)
            })();
            return
        },
        async composerMakeTo(to) {
            this.composerSendTo.push(to)
            this.composerTo = ''
            this.composerToAutocompletions = []
            const tags = this.composerSendTo.map(sendTo => `<div class="tag">${sendTo}</div>`).join(' ')
            $('#composerTo').html(tags + '<br>')
        },
        async composerAutocompleteCC(e) {
            this.composerCC = e.target.innerText.split('\n').last()
            ;(async () => {
                if (app.composerCC.endsWith(',')) app.composerMakeCC(app.composerCC.slice(0, app.composerCC.length - 1));
                const contacts = Object.keys(app.mailbox.contacts || {})
                app.composerCCAutocompletions = contacts.filter(contact => contact.startsWith(app.composerCC)).slice(0, 5)
            })();
            return
        },
        async composerMakeCC(cc) {
            this.composerSendCC.push(cc)
            this.composerCC = ''
            this.composerCCAutocompletions = []
            const tags = this.composerSendCC.map(sendCC => `<div class="tag">${sendCC}</div>`).join(' ')
            $('#composerCC').html(tags + '<br>')
        },
        async composerAutocompleteBCC(e) {
            this.composerBCC = e.target.innerText.split('\n').last()
            ;(async () => {
                if (app.composerBCC.endsWith(',')) app.composerMakeBCC(app.composerBCC.slice(0, app.composerBCC.length - 1));
                const contacts = Object.keys(app.mailbox.contacts || {})
                app.composerBCCAutocompletions = contacts.filter(contact => contact.startsWith(app.composerBCC)).slice(0, 5)
            })();
            return
        },
        async composerMakeBCC(BCC) {
            this.composerSendBCC.push(BCC)
            this.composerBCC = ''
            this.composerBCCAutocompletions = []
            const tags = this.composerSendBCC.map(sendBCC => `<div class="tag">${sendBCC}</div>`).join(' ')
            $('#composerBCC').html(tags + '<br>')
        },
        async composerAutocompleteMsg(e) {
            e.preventDefault();
            insertElementAtCursor(document.createTextNode(this.composerLookahead))
            this.composerMsgBuffer += this.composerLookahead
            this.composerLookahead = ''
        },
        async composerTypeahead(e) {
            try {
                const el = document.getElementById('lookahead')
                el.parentNode.removeChild(el)
            } catch(e) { }
            const c = String.fromCharCode(e.keyCode)
            if (e.keyCode == 13) return;
            if ('.?!'.indexOf(c) > -1) {
                this.composerMsgBuffer = ''
                return;
            }
            this.composerMsgBuffer += c
            this.composerMsgBuffer = this.composerMsgBuffer.trimStart()
            if (this.composerMsgBuffer.length < 2) return;
            const matches = phrases.filter(phrase => phrase.startsWith(this.composerMsgBuffer.toLowerCase()))
            if (matches.length > 0) {
                this.composerLookahead = matches[0].slice(this.composerMsgBuffer.length, matches[0].length)
                const toAdd = (HTML2Element('<span id="lookahead" class="smart-compose unselectable" contenteditable="false" title="Press tab to confirm">'+this.composerLookahead+'</span>'))
                setTimeout(() => {
                    insertElementAtCursor(toAdd)
                }, 100)
            }
            else if (c == ' ') this.composerMsgBuffer = '';
        },
        async composerToEmail() {
            let content = document.getElementById('composerMsg').innerHTML.slice(0, document.getElementById('composerMsg').innerHTML.indexOf('<iframe'))
            try {
                content = content + '<br><br>' + document.getElementById('aiko-reply-iframe').contentWindow.document.getElementsByTagName('body')[0].innerHTML
            }
            catch(e) { }
            const opts = {
                from: `${this.name} <${this.mailbox.email}>`,
                to: this.composerSendTo,
                cc: this.composerSendCC,
                bcc: this.composerSendBCC,
                subject: document.getElementById('composerSubject').innerText,
                generateTextFromHTML: true,
                html: content,
                replyTo: this.mailbox.email,
                attachments: [/* TODO: attachments */]
            }
            /*
            // TODO: ICS
            if (this.ics) {
                opts.icalEvent = {
                    method: 'request',
                    content: this.ics
                }
                this.ics = null
            }
            */
            if (this.composerInReplyTo) {
                const e = this.composerInReplyTo
                if (e.headers['message-id']) opts.inReplyTo = e.headers['message-id']
                if (e.from[0].address) opts.replyTo = e.from[0].address
            }
            console.log(opts)
            this.hideComposer()
            $('#composer').modal('hide')
            return opts
        }
    },
}

// only google oauth is monkey
const google_monkey_mixin = {
    data: {
        g_email: null,
        g_name: null,
        g_picture: null,
        g_access_token: null,
        g_expiry_date: null,
        g_id_token: null,
        g_refresh_token: null,
        g_scope: null,
        g_xoauth: null
    },
    methods: {
        async g_fetchTokens(email) {
            const creds = store.get('credentials:' + email)
            if (!creds.gmail) return console.error("Tried to fetch Google tokens with non-gmail.")
            this.g_email = creds.email
            this.g_name = creds.name
            this.g_picture = creds.picture
            this.g_access_token = creds.access_token
            this.g_expiry_date = creds.expiry_date
            this.g_id_token = creds.id_token
            this.g_refresh_token = creds.refresh_token
            this.g_scope = creds.scope
            this.g_xoauth = creds.xoauth
            await this.g_checkTokens()
        },
        async g_checkTokens() {
            // this should be called before using any xoauth token
            const today = new Date()
            const expiry = new Date(this.g_expiry_date)
            if (today > expiry || !this.g_access_token) {
                await this.g_updateTokens()
                return false
            }
            return true
        },
        async g_updateTokens() {
            const s = await GOAuth.refreshToken(this.g_refresh_token)
            const profile = await (await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + s.id_token)).json()
            const xoauth = btoa(
                "user=" + profile.email + "\u0001auth=Bearer " + s.access_token + "\u0001\u0001"
            )
            store.set('credentials:' + this.g_email, {
                email: this.g_email,
                name: profile.name,
                picture: profile.picture,
                access_token: s.access_token,
                expiry_date: this.g_expiry_date + (s.expires_in * 1000),
                id_token: s.id_token,
                refresh_token: this.g_refresh_token,
                scope: s.scope,
                xoauth: xoauth,
                gmail: true
            })

            await this.g_fetchTokens(this.g_email)
        },
        async gSignIn() {
            const s = await GOAuth.getToken()
            const profile = await (await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + s.id_token)).json()
            const xoauth = btoa(
                "user=" + profile.email + "\u0001auth=Bearer " + s.access_token + "\u0001\u0001"
            )
            // TODO: encrypt credentials
            store.set('credentials:' + profile.email, {
                email: profile.email,
                name: profile.name,
                picture: profile.picture,
                access_token: s.access_token,
                expiry_date: s.expiry_date,
                id_token: s.id_token,
                refresh_token: s.refresh_token,
                scope: s.scope,
                xoauth: xoauth,
                gmail: true
            })

            await this.g_fetchTokens(profile.email)
            return s
        },
        async g_refreshKeys() {
            if (!(await this.g_checkTokens())) {
                await this.connectToMailServer()
            }
        }
    }
}

const msft_oauth_mixin = {
    data: {
        msft_email: null,
        msft_name: null,
        msft_picture: null,
        msft_access_token: null,
        msft_expiry_date: null,
        msft_id_token: null,
        msft_refresh_token: null,
        msft_scope: null,
        msft_xoauth: null
    },
    methods: {
        async msft_fetchTokens(email) {
            const creds = store.get('credentials:' + email)
            if (!creds.msft) return console.error("Tried to fetch MSFT tokens with non-msft.")
            this.msft_email = creds.email
            this.msft_name = creds.name
            this.msft_picture = creds.picture
            this.msft_access_token = creds.access_token
            this.msft_expiry_date = creds.expiry_date
            this.msft_id_token = creds.id_token
            this.msft_refresh_token = creds.refresh_token
            this.msft_scope = creds.scope
            this.msft_xoauth = creds.xoauth
            await this.msft_checkTokens()
        },
        async msft_checkTokens() {
            // this should be called before using any xoauth token
            const today = new Date()
            const expiry = new Date(this.msft_expiry_date)
            if (today > expiry || !this.msft_access_token) {
                await this.msft_updateTokens()
                return false
            }
            return true
        },
        async msft_updateTokens() {
            const s = await MSOauth.refreshToken(this.msft_refresh_token)
            const profile = await (await fetch('https://graph.microsoft.com/v1.0/me', {
                method: 'GET',
                headers: {
                    "Authorization": "Bearer " + s.access_token
                }
            })).json()
            const xoauth = btoa(
                "user=" + (profile.mail || profile.userPrincipalName) + "\u0001auth=Bearer " + s.access_token + "\u0001\u0001"
            )
            store.set('credentials:' + this.msft_email, {
                email: this.msft_email,
                name: profile.givenName,
                picture: null,
                access_token: s.access_token,
                expiry_date: this.msft_expiry_date + (s.expires_in * 1000),
                id_token: s.id_token,
                refresh_token: this.msft_refresh_token,
                scope: s.scope,
                xoauth: xoauth,
                msft: true
            })

            await this.msft_fetchTokens(this.msft_email)
        },
        async msftSignIn() {
            app.fetching = true
            const s = await MSOauth.getToken()
            console.log(s)
            const profile = await (await fetch('https://graph.microsoft.com/v1.0/me', {
                method: 'GET',
                headers: {
                    "Authorization": "Bearer " + s.access_token
                }
            })).json()
            console.log(profile)
            const xoauth = btoa(
                "user=" + (profile.mail || profile.userPrincipalName) + "\u0001auth=Bearer " + s.access_token + "\u0001\u0001"
            )
            // TODO: encrypt credentials
            store.set('credentials:' + (profile.mail || profile.userPrincipalName), {
                email: profile.mail || profile.userPrincipalName,
                name: profile.givenName,
                picture: null,
                access_token: s.access_token,
                expiry_date: s.expiry_date,
                id_token: s.id_token,
                refresh_token: s.refresh_token,
                scope: s.scope,
                xoauth: xoauth,
                msft: true
            })

            app.fetching = false
            await this.msft_fetchTokens(profile.mail || profile.userPrincipalName)
            return s
        },
        async msft_refreshKeys() {
            if (!(await this.msft_checkTokens())) {
                await this.connectToMailServer()
            }
        }
    }
}

const manual_mailbox_mixin = {
    data: {
        other_email: null,
        other_name: null,
        other_picture: null,
        other_password: null,
        other_imap_host: null,
        other_imap_port: null,
        other_smtp_host: null,
        other_smtp_port: null
    },
    methods: {
        async other_fetchCredentials(email) {
            const creds = store.get('credentials:' + email)
            if (!creds.other) return console.error("Tried to fetch OTHER creds with non-other.")
            this.other_email = creds.email
            this.other_name = creds.name
            this.other_picture = creds.picture
            this.other_password = creds.password
            this.other_imap_host = creds.imap_host
            this.other_imap_port = creds.imap_port
            this.other_smtp_host = creds.smtp_host
            this.other_smtp_port = creds.smtp_port
        },
        async otherSignIn(email, password, imapHost, imapPort, smtpHost, smtpPort) {
            app.fetching = true
            store.set('credentials:' + email, {
                name: email, // TODO:
                picture: null, // TODO:
                email: email,
                password: password,
                imap_host: imapHost,
                imap_port: imapPort,
                smtp_host: smtpHost,
                smtp_port: smtpPort,
                other: true
            })
            app.fetching = false
            await this.other_fetchCredentials(email)
        }
    }
}