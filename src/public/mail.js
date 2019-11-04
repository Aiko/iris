const modals_mixin = {
    data: {
        connectionLostModal: false,
        imapErrorModal: false,
        composerErrorModal: false,
        addMailboxModal: false,
        manualIMAPModal: false,
        manualIMAPHost: '',
        manualIMAPPort: 993,
        manualSMTPHost: '',
        manualSMTPPort: 587,
        manualEmail: '',
        manualPassword: '',
        manualMailImage: '',
        addBoardModal: false,
        addBoardModalStep2: false,
        addBoardName: '',
        composerVisible: false,
        showEmailView: false,
        viewEmail: null
    },
    methods: {
        showAddMailbox() {
            this.hideManualIMAPModal()
            this.addMailboxModal = true
            log("Showing add mailbox.")
            $('.add-mailbox').modal('show')
        },
        hideAddMailbox() {
            log("Hiding add mailbox.")
            this.addMailboxModal = false
            this.hideManualIMAPModal()
            $('.add-mailbox').modal('hide')
        },
        forceAddMailbox() {
            this.hideManualIMAPModal()
            this.addMailboxModal = true
            $('.add-mailbox').data('bs.modal', null)
            $('.add-mailbox').modal({
                backdrop: 'static',
                keyboard: false
            })
        },
        showAddBoard() {
            this.hideAddBoardStep2()
            this.addBoardModal = true
            log("Showing add board.")
            $('.new-board').modal('show')
        },
        hideAddBoard() {
            log("Hiding add board.")
            this.addBoardModal = false
            this.hideAddBoardStep2()
            $('.new-board').modal('hide')
        },
        showAddBoardStep2() {
            this.addBoardModalStep2 = true
        },
        hideAddBoardStep2() {
            this.addBoardModalStep2 = false
        },
        showComposer() {
            // block fetching
            this.composerVisible = true
            $('#composer').modal('show')
        },
        hideComposer() {
            // unblock fetching
            this.composerVisible = false
            this.composerClear()
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
        },
        showComposerErrorModal() {
            this.composerErrorModal = true
        },
        hideComposerErrorModal() {
            this.composerErrorModal = false
        },
        showManualIMAPModal() {
            this.manualIMAPModal = true
        },
        hideManualIMAPModal() {
            this.manualIMAPModal = false
        },
        showEmail(email) {
            this.viewEmail = email
            this.showEmailView = true
            $('#emailViewer').modal({
                show: true,
                backdrop: true,
                keyboard: true
            })

        }
    }
}

const app = new Vue({
    el: '#app',
    mixins: [
        mail_api_mixin,
        electron_mixin,
        modals_mixin,
        google_monkey_mixin,
        msft_oauth_mixin,
        manual_mailbox_mixin,
        kanban_mixin,
        ai_mixin,
        composer_mixin
    ],
    data: {
        drag: null,
        loading: true,
        error: null,
        errorNet: 0,
        isOnline: true,
        // Mail Server
        IMAP: null,
        imapHost: '',
        imapPort: 993,
        smtpHost: '',
        smtpPort: 587,
        // which mail provider
        gmail: false,
        msft: false,
        other: false,
        // State
        mailbox: {
            email: '',
            boards: [],
            events: [],
            contacts: {}
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
        doneEmails: [],
        existingIds: [],
        boardIds: new Set(),
        totalMessages: 0,
        unreadMessages: 0,
        fetching: false,
        fetchingOld: false,
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
            return (this.loading = false)
        }
        if (!profile) {
            log('Token invalid, need new token')
            const token = await this.login(email, password)
            if (!token) {
                log('Login credentials invalid, need new login')
                console.error("User is not truly authenticated. Prompting re-signin.")
                store.set('authenticated', null)
                return entry()
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
            return (this.loading = false);
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
            if (this.msft) return this.msft_refreshKeys()
            if (this.other) return true
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
            } else this.gmail = false

            if (settings.msft) {
                this.msft = true
                this.imapHost = 'outlook.office365.com'
                this.imapPort = 993
                this.smtpHost = 'outlook.office365.com'
                this.smtpPort = 587
            } else this.msft = false

            if (settings.other) {
                await this.other_fetchCredentials(this.mailbox.email)
                this.other = true
                this.imapHost = this.other_imap_host
                this.imapPort = this.other_imap_port
                this.smtpHost = this.other_smtp_host
                this.smtpPort = this.other_smtp_port
            } else this.other = false
            // TODO: branches for every type of inbox we support

            this.fetching = true
            await this.connectToMailServer()
            this.currentFolder = this.inboxFolder

            if (firstTime) {
                // setup mailbox
                this.loading = true
                await this.fetchLatestEmails(200)
                this.loading = false
            } else {
                // restore cache
                this.emails = store.get('cache:' + this.mailbox.email + ':' + this.currentFolder, [])
                this.mailbox.boards = this.mailbox.boards.map(board => {
                    board.emails = store.get('cache:' + this.mailbox.email + ':' + board.folder, [])
                    board.emails.map(e => this.boardIds.add(e.headers['message-id']))
                    return board
                })
                this.doneEmails = store.get('cache:' + this.mailbox.email + ':' + 'donemail', [])
                if (!this.emails || this.emails.length <= 0) {
                    this.emails = []
                    await this.fetchLatestEmails(200)
                } else {
                    this.existingIds = this.emails.map(_ => _.headers.id)
                }
                this.mailbox.contacts = store.get('contacts:' + this.mailbox.email, {})
                if (!this.mailbox.contacts || Object.keys(this.mailbox.contacts).length == 0) {
                    await this.getContacts()
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
                case "EPIPE":
                    console.error(e)
                    if (this.errorNet > 0) {
                        this.showIMAPErrorModal();
                        break;
                    }
                    this.errorNet += 1
                    await this.connectToMailServer()
                    break;
                default:
                    this.error = e
                    console.log(e.code)
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
                log("Fetched tokens...")
                await this.IMAP.login(this.g_email, null, this.g_xoauth)
                log("Logged in...")
            }

            if (this.msft) {
                log("Going MSFT route...")
                await this.msft_fetchTokens(this.mailbox.email)
                log("Fetched tokens...")
                await this.IMAP.login(this.msft_email, null, this.msft_xoauth)
                log("Logged in...")
            }

            if (this.other) {
                log("Going OTHER route...")
                await this.other_fetchCredentials(this.mailbox.email)
                log("Fetches credentials...")
                await this.IMAP.login(this.other_email, this.other_password, null)
                log("Logged in...")
            }
            //TODO: branches for every type of inbox


            await this.syncWithMailServer()
            this.errorNet = 0
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
            if (this.msft) {
                log(this.folders);
                throw "Error msft"
            }
            if (this.other) {
                this.inboxFolder = 'INBOX'

                // Identify sent folder
                this.sentFolder = this.folders.filter(f => f.indexOf('Sent' > -1 || f.indexOf('sent') > -1))
                if (this.sentFolder.length > 0) this.sentFolder = this.sentFolder[0]
                else this.sentFolder = ''

                this.spamFolder = this.folders.filter(f => f.indexOf('Spam') > -1 || f.indexOf('spam') > -1 || f.indexOf('Junk') > -1)
                if (this.spamFolder.length > 0) this.spamFolder = this.spamFolder[0]
                else this.spamFolder = ''

                this.trashFolder = this.folders.filter(f => f.indexOf('Trash') > -1 || f.indexOf('trash') > -1 || f.indexOf('Deleted') > -1)
                if (this.trashFolder.length > 0) this.trashFolder = this.trashFolder[0]
                else this.trashFolder = ''
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
            this.mailbox.boards = this.mailbox.boards.map(board => {
                board.emails = store.get('cache:' + this.mailbox.email + ':' + board.folder, [])
                board.emails.map(e => this.boardIds.add(e.headers['message-id']))
                return board
            })
            log("Sync completed.")
        },
        async processEmails(emails) {
            return await Promise.all(emails.map(async email => {
                email = JSON.parse(JSON.stringify(email))
                if (email.attachments) {
                    for (let j = 0; j < email.attachments.length; j++) {
                        email.attachments[j].content = null
                    }
                }
                if (!email.html) email.html = email.text || ''
                email.html = email.html
                    .replace(/\)(\n| |\r\n)*[0-9]* NO The specified message set is invalid./gi, '')
                    .replace(/\)(\n| |\r\n)*[0-9]* OK (Success|FETCH completed)/gi, '')

                if (!email.text) email.text = HTML2Text(email.html)
                email.text = email.text
                    .replace(/\)(\n| |\r\n)*[0-9]* NO The specified message set is invalid./gi, '')
                    .replace(/\)(\n| |\r\n)*[0-9]* OK (Success|FETCH completed)/gi, '')

                if (email.headers["list-unsubscribe"] ||
                    email.headers["list-id"] ||
                    email.html.match(
                        /unsubscribe|email ([^\.\?!]*)preferences|marketing preferences|opt( |-)*out|turn off([^\.\?!]*)email/gi
                    )
                ) {
                    email.headers.subscription = true
                    email = JSON.parse(JSON.stringify(email))
                }

                const parser = new DOMParser()
                const links = Array.from(parser.parseFromString(email.html, 'text/html').getElementsByName('a'))
                const verifyLinks = links.filter(link => link.innerText.match(/((verify|confirm).*email)/gi) || (link.href && link.href.match(/verify/gi))).map(link => link.href).filter(_ => _)
                const subLinks = links.filter(link => link.innerText.match(/(\bsubscribe .*)/gi)).map(link => link.href).filter(_ => _)
                if (verifyLinks.length > 0) email.verify = verifyLinks[0]
                if (subLinks.length > 0) email.subscribe = subLinks[0]
                if (email.attachments) {
                    const cal_invites = email.attachments.map(attachment => attachment.filename).filter(fn => fn.endsWith('.ics'))
                    if (cal_invites.length > 0) email.calendar = true
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

                if (!email.headers.subscription) {
                    let to_test = sentences
                    if (to_test.length > 15) to_test = email.summary
                    email.actionables = await Promise.all(
                        to_test.filter(
                            async sentence => await this.choke(sentence) > 0.4
                        )
                    )

                    email.intents = (await Promise.all(
                        email.actionables.map(this.intent)
                    )).filter(_=>_).sort((a, b) => b.confidence - a.confidence)

                    if (email.intents.filter(e => e.time && e.confidence > 0.5).length > 0) email.intents = email.intents.filter(e => e.time)[0]

                    email.scheduling = email.intents && email.intents.length > 0 && email.intents[0].type == 'Event';
                }

                if (!email.verify && email.headers && email.headers['list-unsubscribe'])
                    email.unsubscribe = email.headers['list-unsubscribe'].replace(/<|>/g, '')

                if (email.html.indexOf('pixel.gif') > -1 || email.html.indexOf('track/open') > -1) email.tracker = true

                email.messageId = email.headers['message-id']

                return email
            }))
        },
        async getContacts() {
            log("Fetching contacts")
            this.fetching = true
            try {
                log("Refreshing keys")
                await this.refreshKeys()
                log("Selecting folder")
                const {exists, uidnext} = await this.IMAP.select(this.currentFolder)
                log("Getting senders")
                const senders = await this.IMAP.getSenders(1, '*')
                // TODO: get receivers from emails sent _to_ people as well
                log("Making contacts")
                this.loading = true
                const contacts = {}
                senders.map(email => {
                    if (email.from && email.from.length > 0) {
                        const from = email.from[0]
                        if (from.address) {
                            if (!contacts[from.address])
                                contacts[from.address] = from.name || from.address
                        }
                    }
                })
                this.mailbox.contacts = contacts
                log("Storing cache")
                store.set('contacts:' + this.mailbox.email, contacts)
                log("Done. Successfully got contacts!")
                this.loading = false
            } catch (e) {
                console.error(e)
            }
            this.fetching = false
        },
        async fetchEmails(start, stop, overwrite = true, sort = false, filterDups = true, getBoards = true, pushToEnd = false, fetchAnyways=false) {
            if ((this.fetching && !fetchAnyways) || this.addMailboxModal || this.composerVisible || this.addBoardModal) return;
            log("Fetching emails:", this.currentFolder, start, ':', stop,
                '\noverwrite?', overwrite, '\nsort?', sort, '\nfilterDups?', filterDups, '\ngetBoards?', getBoards
            )
            this.fetching = true
            try {
                await this.refreshKeys()
                const {exists, uidnext} = await this.IMAP.select(this.currentFolder)
                if (stop == '*' && uidnext) stop = uidnext
                console.time('Fetching emails.')
                let emails = await this.IMAP.getEmails(start, stop)
                console.timeEnd('Fetching emails.')
                emails = emails.filter(email =>
                        email.headers.id &&
                        email.headers.id != '*' &&
                        email.from &&
                        eval(email.headers.id) >= start
                    ) // TODO: setup getting UID next so we only pull to the next uid, ignoring '*' aka recent
                if (emails.length == 1) log(emails)
                emails = emails.reverse()
                console.time('Processing emails.')
                emails = await this.processEmails(emails)
                console.timeEnd('Processing emails.')

                console.time("Updating app.")
                emails = emails.filter(email => {
                    if (this.existingIds.includes(email.headers.id)) {
                        if (overwrite) Vue.set(this.emails, this.existingIds.indexOf(email.headers.id), email)
                        return false;
                    }
                    return true;
                })

                if (emails.length > 0) {
                    if (pushToEnd)
                        this.emails.push(...emails)
                    else
                        this.emails.unshift(...emails)
                    this.existingIds.unshift(...emails.map(_ => _.headers.id))
                    if (sort) {
                        this.emails.sort((m1, m2) => m2.headers.id - m1.headers.id)
                        this.existingIds.sort((a, b) => b - a)
                    }
                }
                console.timeEnd("Updating app.")

                console.time("Updating Kanban emails.")
                if (getBoards) {
                    // have to do this synchronously in a loop like this.
                    // this is because socket can only handle sychronous series of commands :(
                    // e.g. select - fetch - select - fetch
                    // if we did this async it would make a race condition:
                    // e.g. select - select - fetch - fetch
                    const originalFolder = this.currentFolder
                    console.time("Updating board emails.")
                    for (let i = 0; i < this.mailbox.boards.length; i++) {
                        console.time("Fetching emails for one board.")
                        const boardFolder = this.mailbox.boards[i].folder
                        const {exists, uidnext} = await this.IMAP.select(boardFolder)
                        let boardEmails;
                        if (!exists) continue;
                        if (this.mailbox.boards[i].emails && this.mailbox.boards[i].emails.length > 0) {
                            const max_board_id = Math.max(...this.mailbox.boards[i].emails.map(email => email.needsrefresh ? 0 : email.headers.id))
                            boardEmails = await this.IMAP.getEmails(max_board_id + 1, uidnext)
                            boardEmails = boardEmails.filter(email =>
                                    email.headers.id &&
                                    email.headers.id != '*' &&
                                    email.from &&
                                    eval(email.headers.id) >= max_board_id
                            )
                        }
                        else boardEmails = await this.IMAP.getEmails('1', uidnext)
                        boardEmails = boardEmails.filter(email =>
                            email.headers.id &&
                            email.headers.id != '*' &&
                            email.from
                        )
                        console.timeEnd("Fetching emails for one board.")
                        // TODO: you need to enforce some sort of limit on # of emails
                        // they can put in the board. for now, the caching limits this
                        // inherently to 100. maybe more needed in future niggaboosmoocheritos
                        console.time("Processing emails for one board.")
                        boardEmails = boardEmails.reverse()
                        boardEmails = await this.processEmails(boardEmails)
                        boardEmails = boardEmails.map(e => {e.board = this.mailbox.boards[i].folder; return e})
                        if (!this.mailbox.boards[i].emails) this.mailbox.boards[i].emails = []
                        console.timeEnd("Processing emails for one board.")
                        console.time("Updating renderer.")
                        this.mailbox.boards[i].emails.unshift(...boardEmails)
                        boardEmails.map(e => this.boardIds.add(e.headers['message-id']))
                        console.timeEnd("Updating renderer.")
                        console.time("Caching board emails.")
                        const to_cache = this.mailbox.boards[i].emails.slice(0, 100)
                        queueCache('cache:' + this.mailbox.email + ':' + this.mailbox.boards[i].folder, to_cache)
                        console.timeEnd("Caching board emails.")
                    }
                    console.timeEnd("Updating board emails.")
                    console.time("Fetching Done emails.")
                    const {exists, uidnext} = await this.IMAP.select('"[Aiko Mail (DO NOT DELETE)]/Done"')
                    let doneEmails;
                    if (this.doneEmails && this.doneEmails.length > 0) {
                        const max_done_id = Math.max(...this.doneEmails.map(doneEmail => doneEmail.needsrefresh ? 0 : doneEmail.headers.id))
                        doneEmails = await this.IMAP.getEmails(max_done_id + 1, uidnext)
                        doneEmails = doneEmails.filter(email =>
                                email.headers.id &&
                                email.headers.id != '*' &&
                                email.from &&
                                eval(email.headers.id) >= max_done_id
                        )
                    }
                    else doneEmails = await this.IMAP.getEmails('1', uidnext)
                    doneEmails = doneEmails.filter(email =>
                        email.headers.id &&
                        email.headers.id != '*' &&
                        email.from
                    )
                    console.timeEnd("Fetching Done emails.")
                    // TODO: done emails have a limit :/
                    console.time("Processing done emails.")
                    doneEmails = doneEmails.reverse()
                    doneEmails = await this.processEmails(doneEmails)
                    doneEmails = doneEmails.map(doneEmail => {doneEmail.board = 'Done'; return doneEmail})
                    console.timeEnd("Processing done emails.")
                    if (!this.doneEmails) this.doneEmails = []
                    console.time("Updating renderer.")
                    this.doneEmails.unshift(...doneEmails)
                    doneEmails.map(e => this.boardIds.add(e.headers['message-id']))
                    console.timeEnd("Updating renderer.")
                    console.time("Caching done emails.")
                    const to_cache = this.doneEmails.slice(0, 100)
                    queueCache('cache:' + this.mailbox.email + ':' + 'donemail', to_cache)
                    console.timeEnd("Caching done emails.")
                    console.time("Reselecting inbox.")
                    this.IMAP.select(originalFolder)
                    console.timeEnd("Reselecting inbox.")
                }
                console.timeEnd("Updating Kanban emails.")


                console.time("Setting cache.")
                // max cache is 50
                console.time("Stringifying cache.")
                const caching = this.emails.slice(0, 200)
                console.timeEnd("Stringifying cache.")
                queueCache('cache:' + this.mailbox.email + ':' + this.currentFolder, caching)
                console.timeEnd("Setting cache.")

                this.fetching = false
                this.errorNet = 0
                this.hideIMAPErrorModal()
            } catch (e) {
                this.fetching = false
                console.error(e)
                this.showIMAPErrorModal()
            }
        },
        async fetchLatestEmails(n) {
            if (this.fetching) return;
            log("Fetching", n, "latest emails")
            // fetches n latest emails
            await this.refreshKeys()
            this.totalMessages = await this.IMAP.countMessages(this.currentFolder)
            await this.fetchEmails(Math.max(0, this.totalMessages - n), '*', false, true, true)
        },
        async sendComposedEmail() {
            log("Sending email...")
            await this.refreshKeys()
            const mail = await this.composerToEmail()
            let s;
            if (this.gmail) {
                s = await Mailman(mail, this.smtpHost, this.smtpPort, username=this.g_email, password='', xoauth=this.g_access_token)
            }
            if (this.other) {
                s = await Mailman(mail, this.smtpHost, this.smtpPort, username=this.other_email, password=this.other_password)
            }
            // TODO: branches for every email provider
            if (s.error) {
                this.showComposerErrorModal()
                setTimeout(() => app.hideComposerErrorModal(), 7 * 1000)
                console.error(s)
                return
            }
            console.log(s)
        },
        onScroll ({ target: { scrollTop, clientHeight, scrollHeight }}) {
            if (scrollTop + clientHeight >= scrollHeight - 600) {
                if (this.fetchingOld) return;
                console.log("Fetching more emails.")
                this.fetchingOld = true
                const last_email = this.emails.last().headers.id
                if (last_email > 0)
                    this.fetchEmails(Math.max(0, last_email - 80), last_email,
                        overwrite=true, sort=true, filterDups=true, getBoards=false, pushToEnd=true, fetchAnyways=true)
                        .then(() => app.fetchingOld = false)
            }
        },
        async addGoogle() {
            const s = await this.gSignIn()
            if (s) {
                await this.hideAddMailbox()
                const r = await this.addMailbox(this.g_email)
                if (r) {
                    store.set('settings:' + this.g_email, {gmail: true})
                    await this.switchToMailbox(this.mailboxes.last(), true)
                }
            }
        },
        async addMSFT() {
            const s = await this.msftSignIn()
            if (s) {
                await this.hideAddMailbox()
                const r = await this.addMailbox(this.msft_email)
                console.log(r)
                if (r) {
                    store.set('settings:' + this.msft_email, {msft: true})
                    await this.switchToMailbox(this.mailboxes.last(), true)
                }
            }
        },
        async addExchange() {
            this.showManualIMAPModal()
            this.manualIMAPHost = 'outlook.office365.com'
            this.manualIMAPPort = 993
            this.manualSMTPHost = 'outlook.office365.com'
            this.manualSMTPPort = 587
            this.manualMailImage = 'assets/img/exchange.png'
        },
        async addOther() {
            this.showManualIMAPModal()
        },
        async addManualMailbox() {
            await this.otherSignIn(
                this.manualEmail,
                this.manualPassword,
                this.manualIMAPHost,
                this.manualIMAPPort,
                this.manualSMTPHost,
                this.manualSMTPPort
            )
            await this.hideAddMailbox()
            const r = await this.addMailbox(this.other_email)
            console.log(r)
            if (r) {
                store.set('settings:' + this.other_email, {other: true})
                await this.switchToMailbox(this.mailboxes.last(), true)
            }
        },
        async addBoard() {
            const name = this.addBoardName
            this.fetching = true
            this.loading = true
            this.hideAddBoard()
            this.mailbox.boards.push({
                emails: [],
                name: name
            })
            await this.updateBoards()
            this.loading = false
        },
        async selectFolder(email) {
            if (email.board) {
                if (email.board == 'Done') await this.IMAP.select('"[Aiko Mail (DO NOT DELETE)]/Done"')
                else await this.IMAP.select(email.board)
            } else await this.IMAP.select(this.currentFolder)
        },
        async read(email) {
            await this.refreshKeys()
            await this.selectFolder(email)
            await this.IMAP.read(email.headers.id)
        },
    }
})

const update = async () => {
    if (app.mailbox && app.mailbox.email && !app.loading &&
        app.isOnline && !app.fetching &&
        !app.addMailboxModal && !app.addBoardModal && !app.composerVisible) {
        if (app.emails.length > 0) {
            const max_id = Math.max(...app.emails.map(email => email.headers.id))
            app.fetchEmails(max_id + 1, '*')
        } else {
            app.fetchLatestEmails(200)
        }
    }
}

setInterval(update, 10000)

$('#composer').on('hidden.bs.modal', app.hideComposer);