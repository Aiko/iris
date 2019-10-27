const modals_mixin = {
    data: {
        connectionLostModal: false,
        imapErrorModal: false,
    },
    methods: {
        showAddMailbox() {
            $('.add-mailbox').modal('show')
        },
        hideAddMailbox() {
            $('.add-mailbox').modal('hide')
        },
        forceAddMailbox() {
            $('.add-mailbox').data('bs.modal', null)
            $('.add-mailbox').modal({
                backdrop: 'static',
                keyboard: false
            })
        },
        showConnectionLost() {
            this.connectionLostModal = true
        },
        hideConnectionLost() {
            this.connectionLostModal = false
        },
        showIMAPErrorModal() {
            this.imapErrorModal = true
        },
        hideIMAPErrorModal() {
            this.imapErrorModal = false
        }
    }
}

const app = new Vue({
    el: '#app',
    mixins: [mail_api_mixin, electron_mixin, modals_mixin, google_monkey_mixin, ai_mixin],
    data: {
        loading: true,
        error: null,
        isOnline: true,
        // Mail Server
        IMAP: null,
        imapHost: '',
        imapPort: 993,
        smtpHost: '',
        smtpPort: 587,
        // which mail provider
        gmail: false,
        other: true,
        // State
        mailbox: {
            email: '',
            boards: [],
            events: []
        },
        // Folders
        folders: [],
        inboxFolder: 'INBOX',
        sentFolder: '',
        spamFolder: '',
        archiveFolder: '',
        trashFolder: '',
        currentFolder: '',
        // Inbox Management
        emails: [],
        existingIds: [],
        totalMessages: 0,
        unreadMessages: 0,
        fetching: false,
        lastUpdated: null,
        hideSubscriptions: true
    },
    computed: {

    },
    watch: {
        loading(isLoading, wasLoading) {
            if (wasLoading && isLoading) return;
            if (wasLoading && !isLoading) {
                setTimeout(() => {
                    document.getElementById('fixed').style.display = 'none'
                }, 300)
                return
            }
            if (!wasLoading && isLoading) {
                document.getElementById('fixed').style.display = ''
                return
            }
            return
        },
        async currentFolder(isFolder, wasFolder) {
            log("Switched from", wasFolder, "to", isFolder)
            if (this.gmail) {
                if (!(await this.g_checkTokens())) {
                    await this.connectToMailServer()
                }
            }
            this.IMAP.select(isFolder)
        },
        async isOnline(hasWifi, hadWifi) {
            if (!hadWifi && hasWifi) {
                this.hideConnectionLost()
            }
            if (hadWifi && !hasWifi) {
                this.showConnectionLost()
            }
        },
        async fetching(isFetching, wasFetching) {
            if (wasFetching && !isFetching) {
                this.lastUpdated = new Date()
            }
        },
    },
    async created() {
        // fetch existing credentials
        if (!store.get('authenticated', false)) entry()
        const {
            token,
            email,
            password
        } = store.get('authenticated', {
            token: null,
            email: null,
            password: null
        })

        if (!token) return entry()

        this.token = token

        // fetch profile, refresh token if needed, relogin if needed
        let profile = await this.fetchProfile()
        if (profile.message == 'Failed to fetch') {
            app.isOnline = false
            // TODO: do the cache stuff because we are offline
            return
        }
        if (!profile) {
            log('Token invalid, need new token')
            const token = await this.login(email, password)
            if (!token) {
                log('Login credentials invalid, need new login')
                console.error("User is not truly authenticated. Prompting re-signin.")
                store.set('authenticated', null)
                entry()
                return
            }
            store.set('authenticated', {
                email: email,
                password: password,
                token: token
            })
            profile = await this.fetchProfile()
        } else {
            log('Token still valid and will be used as active token.')
        }

        // if no mailboxes, ask user to add one
        if (this.mailboxes.length == 0) {
            this.forceAddMailbox()
            return;
        }

        // TODO: otherwise...
        const current_mailbox = store.get('settings:current-mailbox', null)
        if (current_mailbox) {
            const mbox = this.mailboxes.filter(m => m.email == current_mailbox)
            if (mbox.length > 0) this.switchToMailbox(mbox[0])
            else {
                this.switchToMailbox(this.mailboxes[0])
            }
        } else {
            this.switchToMailbox(this.mailboxes[0])
        }

        this.loading = false
    },
    methods: {
        async refreshKeys() {
            if (this.gmail) return this.g_refreshKeys()
            // TODO: branches for every mailserver
        },
        async switchToMailbox(mailbox, firstTime = false) {
            log("Switching mailbox to", mailbox)
            this.mailbox = mailbox
            const settings = store.get('credentials:' + this.mailbox.email, null)
            if (!settings) {
                // TODO: cloud settings
                return console.error("We don't have settings for this mailbox!")
            }
            store.set('settings:current-mailbox', this.mailbox.email)

            if (settings.gmail) {
                this.gmail = true
                this.imapHost = 'imap.gmail.com'
                this.imapPort = 993
                this.smtpHost = 'smtp.gmail.com'
                this.smtpPort = 587
            }
            // TODO: branches for every type of inbox we support

            await this.connectToMailServer()
            this.currentFolder = this.inboxFolder

            this.fetching = true
            if (firstTime) {
                // setup mailbox
                await this.fetchLatestEmails(200)
            } else {
                // restore cache
                this.emails = store.get('cache:' + this.mailbox.email + ':' + this.currentFolder, [])
                if (!this.emails || this.emails.length <= 0) {
                    this.emails = []
                    await this.fetchLatestEmails(200)
                } else {
                    this.existingIds = this.emails.map(_ => _.headers.id)
                }
            }
            this.fetching = false
        },
        async imapError(e) {
            switch (e.code) {
                case "ECONNRESET":
                case "ENOTFOUND":
                    if (this.isOnline) this.isOnline = false;
                    break;
                default:
                    this.error = e
                    console.error(e)
                    this.showIMAPErrorModal()
            }

            setTimeout(app.connectToMailServer, 5000)
        },
        async connectToMailServer() {
            log("Reconnecting to mailserver. This could take a minute!")
            if (this.IMAP) {
                log("Destroying previous IMAP connection. Any current socket read/write operations will be suspended.")
                this.IMAP.close()
            }
            this.IMAP = Mailbox(this.imapHost, this.imapPort)
            await this.IMAP.open(null, null, null, null, null, app.imapError).catch(console.error)


            // login
            if (this.gmail) {
                log("Going GMail route...")
                await this.g_fetchTokens(this.mailbox.email)
                await this.IMAP.login(this.g_email, null, this.g_xoauth)
            }

            //TODO: branches for every type of inbox


            await this.syncWithMailServer()
            this.hideIMAPErrorModal()
            this.hideConnectionLost()
            if (!this.isOnline) this.isOnline = true
        },
        async syncWithMailServer() {
            log("Syncing with mail server.")
            await this.refreshKeys()

            this.folders = await this.IMAP.getFolders()
            if (this.gmail) {
                this.inboxFolder = 'INBOX'
                this.sentFolder = '"[Gmail]/Sent Mail"'
                this.spamFolder = '"[Gmail]/Spam"'
                this.archiveFolder = '"[Gmail]/All Mail"'
                this.trashFolder = '"[Gmail]"/Trash'
            }
            // TODO: branches for every mailserver

            const board_folders = this.folders.filter(f => f.includes('[Aiko Mail (DO NOT DELETE)]/'))
            this.mailbox.boards = await Promise.all(this.mailbox.boards.map(async board => {
                board.folder = `"[Aiko Mail (DO NOT DELETE)]/${board._id}"`
                if (board_folders.includes(board.folder))
                    return board;
                log(board.folder, 'does not exist!')
                await this.IMAP.createFolder(board.folder)
                return board;
            }))
            if (!board_folders.includes(`"[Aiko Mail (DO NOT DELETE)]/Done"`)) {
                log('Done folder does not exist!')
                await this.IMAP.createFolder(`"[Aiko Mail (DO NOT DELETE)]/Done"`)
            }
            this.folders = await this.IMAP.getFolders() // resync folders
            log("Sync completed.")
        },
        async processEmails(emails) {
            // using for loop for MAXIMUM speed
            return await Promise.all(emails.map(async email => {
                email = JSON.parse(JSON.stringify(email))
                if (email.attachments) {
                    for (let j = 0; j < email.attachments.length; j++) {
                        email.attachments[j].content = null
                    }
                }
                if (!email.text) email.text = HTML2Text(email.html)
                if (!email.html) email.html = email.text || ''
                if (email.headers["list-unsubscribe"] ||
                    email.headers["list-id"] ||
                    email.html.match(
                        /unsubscribe|email ([^\.\?!]*)preferences|marketing preferences|opt( |-)*out|turn off([^\.\?!]*)email/gi
                    )
                ) {
                    email.headers.subscription = true
                    email = JSON.parse(JSON.stringify(email))
                }

                const replyStarts = /On \w+ [0-9]+, [0-9]+, at [0-9]+:[0-9]+ \w+, \w+ <.*> wrote:/g.exec(email.text)
                email.messageText = email.text.slice(0, replyStarts ? replyStarts.index : email.text.length + 2)
                const sentences = email.messageText.replace(/(?!\w\.\w.)(?![A-Z][a-z]\.)(?:\.|!|\?)\s/g, '$&AIKO-SPLIT').split(/AIKO-SPLIT/g)

                const summary = await this.summarize(email.text, 3)
                if (summary) {
                    email.summary = summary
                    email.summaryText = summary.join(' ')
                } else {
                    email.summaryText = sentences.slice(0, 3)
                }

                email.actionables = await Promise.all(
                    sentences.filter(
                        async sentence => await this.choke(sentence) > 0.65
                    )
                )

                return email
            }))
        },
        async fetchEmails(start, stop, overwrite = true, sort = false, filterDups = true) {
            this.fetching = true
            setTimeout(() => {
                app.fetching = false
            }, 5000)
            try {
                await this.refreshKeys()
                let emails = (await this.IMAP.getEmails(start, stop))
                emails = emails.reverse()
                emails = await this.processEmails(emails)

                emails = emails.filter(email => {
                    if (this.existingIds.includes(email.headers.id)) {
                        if (overwrite) Vue.set(this.emails, this.existingIds.indexOf(email.headers.id), email)
                        return false;
                    }
                    return true;
                })

                if (emails.length > 0) {
                    this.emails.unshift(...emails)
                    this.existingIds.unshift(...emails.map(_ => _.headers.id))
                    if (sort) {
                        this.emails.sort((m1, m2) => m2.headers.id - m1.headers.id)
                        this.existingIds.sort((a, b) => b - a)
                    }
                }

                // TODO: fetch boards if inbox

                // max cache is 50
                const caching = JSON.parse(JSON.stringify(this.emails.slice(0, 50)))
                queueCache('cache:' + this.mailbox.email + ':' + this.currentFolder, caching)

                this.fetching = false
                this.hideIMAPErrorModal()
            } catch (e) {
                console.error(e)
                this.showIMAPErrorModal()
                this.fetching = false
            }
        },
        async fetchLatestEmails(n) {
            // fetches n latest emails
            await this.refreshKeys()
            this.totalMessages = await this.IMAP.countMessages(this.currentFolder)
            await this.fetchEmails(Math.max(0, this.totalMessages - n), '*', false, true, true)
        },
        async addGoogle() {
            const s = await this.gSignIn()
            if (s) {
                await this.hideAddMailbox()
                const r = await this.addMailbox(this.g_email)
                if (r) await this.switchToMailbox(this.mailboxes.last(), true)
            }
        }
    }
})

const update = async () => {
    if (app.mailbox && app.mailbox.email && !app.loading &&
        app.isOnline && !app.fetching) {
        if (app.emails.length > 0) {
            app.fetchEmails(app.emails[0].headers.id + 1, '*')
        } else {
            app.fetchLatestEmails(50)
        }
    }
}

setInterval(update, 10000)