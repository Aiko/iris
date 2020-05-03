const MAILAPI_TAG = ["%c[MAIL API]", "background-color: #ffdddd; color: #000;"]

const mailapi = {
    data: {
        connected: false,
        imapConfig: {
            email: '',
            host: '',
            port: 993,
            user: '',
            pass: '',
            xoauth2: '',
            secure: true,
            provider: 'other'
        },
        mailboxes: [],
        currentMailbox: '',
        folderNames: {
            inbox: 'INBOX',
            sent: '',
            starred: '',
            spam: '',
            drafts: '',
            archive: '',
            trash: ''
        },
        boardNames: [],
        inbox: {
            uidLatest: -1,
            //modSeq: -1,
            emails: []
        },
        boards: {},
        syncing: false
    },
    watch: {
        'inbox.emails': async function (updatedInbox) {
            // NOTE: important to check length
            // dont want to store empty inbox if it is reset
            // if you need to store an empty inbox do it manually!
            // you also should set the uidLatest every time it has changed

            if (updatedInbox.length > 0) {
                info(...MAILAPI_TAG, "Saving inbox cache...")
                await BigStorage.store(this.imapConfig.email + '/inbox', {
                    uidLatest: this.inbox.uidLatest,
                    //modSeq: this.inbox.modSeq,
                    emails: this.inbox.emails.slice(0,90)
                })
                info(...MAILAPI_TAG, "Saved inbox cache.")
            }
        },
    },
    created() {
        info(...MAILAPI_TAG, "Mounted IMAP processor. Please ensure this only ever happens once.")
    },
    methods: {
        async initIMAP() {
            info(...MAILAPI_TAG, "Registering listeners...")
            ipcRenderer.on('email was deleted',
                (_, {
                    path,
                    seq
                }) => app.onDeleteEmail(path, seq))
            ipcRenderer.on('exists value changed',
                (_, {
                    path,
                    seq
                }) => app.onSyncRequested(path, seq))
            info(...MAILAPI_TAG, "Loading address cache...")
            this.mailboxes = (await SmallStorage.load('mailboxes')) || [];
            info(...MAILAPI_TAG, "Loading previously selected mailbox")
            let currentEmail = await SmallStorage.load('current-mailbox')
            if (!currentEmail) {
                if (this.mailboxes.length > 0) {
                    currentEmail = this.mailboxes[0]
                } else {
                    this.forceAddMailbox = true
                    return
                }
            }
            this.currentMailbox = currentEmail
            info(...MAILAPI_TAG, "Loading IMAP config...")
            await this.loadIMAPConfig(currentEmail)
            if (this.imapConfig.provider == 'google') {
                info(...MAILAPI_TAG, "Loading Google config...")
                await this.google_loadConfig()
                await this.google_checkTokens()
            }
            this.switchMailServer()
        },
        async saveIMAPConfig() {
            await SmallStorage.store(this.imapConfig.email + '/imap-config', this.imapConfig)
        },
        async loadIMAPConfig(email) {
            this.imapConfig = await SmallStorage.load(email + '/imap-config')
        },
        // Wrapper methods to create corresponding IPC tasks
        task_MakeNewClient(config) {
            return this.ipcTask('please make new client', config)
        },
        task_ConnectToServer() {
            return this.ipcTask('please connect to server', {})
        },
        task_DisconnectFromServer() {
            return this.ipcTask('please disconnect from server', {})
        },
        task_ListFolders() {
            return this.ipcTask('please list folders', {})
        },
        task_NewFolder(path) {
            return this.ipcTask('please make a new folder', {
                path,
            })
        },
        task_DeleteFolder(path) {
            return this.ipcTask('please delete a folder', {
                path,
            })
        },
        task_OpenFolder(path) {
            return this.ipcTask('please open a folder', {
                path,
            })
        },
        task_FetchEmails(path, sequence, peek, modseq) {
            return this.ipcTask('please get emails', {
                path,
                sequence,
                peek,
                //modseq
            })
        },
        task_SearchEmails(path, query) {
            /*
                SEARCH UNSEEN
                query = {unseen: true}
                SEARCH KEYWORD 'flagname'
                query = {keyword: 'flagname'}
                SEARCH HEADER 'subject' 'hello world'
                query = {header: ['subject', 'hello world']};
                SEARCH UNSEEN HEADER 'subject' 'hello world'
                query = {unseen: true, header: ['subject', 'hello world']};
                SEARCH OR UNSEEN SEEN
                query = {or: {unseen: true, seen: true}};
                SEARCH UNSEEN NOT SEEN
                query = {unseen: true, not: {seen: true}}
                SINCE 2011-11-23
                query = {since: new Date(2011, 11, 23, 0, 0, 0)}
            */
            return this.ipcTask('please look for emails', {
                path,
                query
            })
        },
        task_SetFlags(path, sequence, flags) {
            // there is a non-blind version of this that returns the emails
            // just set blind: false in the payload
            return this.ipcTask('please set email flags', {
                path,
                sequence,
                flags,
                blind: true
            })
        },
        task_DeleteEmails(path, sequence) {
            return this.ipcTask('please delete emails', {
                path,
                sequence
            })
        },
        task_CopyEmails(srcPath, dstPath, sequence) {
            return this.ipcTask('please copy emails', {
                srcPath,
                dstPath,
                sequence
            })
        },
        task_UploadEmail(dstPath, message) {
            return this.ipcTask('please upload an email', {
                dstPath, message
            })
        },
        task_MoveEmails(srcPath, dstPath, sequence) {
            return this.ipcTask('please move emails', {
                srcPath,
                dstPath,
                sequence
            })
        },
        // Listener methods
        async onDeleteEmail(path, seq) {
            // TODO: seq is the sequence number of the deleted message
            // should check if we have seq in our local version of
            // the folder with "path"
            // if so, remove that message locally (to maintain sync)
        },
        async onSyncRequested(path, seq) {
            // TODO: sync when requested
            // probably only need to sync if path is inbox or a board
        },
        async onIMAPConnectionError() {
            // NOTE: this is less of a listener and something this module calls
            // app.toastIMAPError()
            // TODO: uncomment once the toast manager has been configured
        },
        // Utility methods
        folderWithSlug(slug) {
            return `[Aiko Mail]/${slug}`
        },
        async findFolderNames() {
            // load cache for folderNames and boardNames
            this.folderNames = (
                await SmallStorage.load(this.imapConfig.email + ':folder-names') ||
                this.folderNames
            )
            this.boardNames = (
                await SmallStorage.load(this.imapConfig.email + ':board-names') ||
                this.boardNames
            )

            // Fetch remote folders
            const folders = await this.callIPC(this.task_ListFolders())
            if (!folders || !(typeof folders == "object")) return window.error(...MAILAPI_TAG, folders)

            // Default folder names
            this.folderNames.inbox = "INBOX"
            if (this.imapConfig.provider == 'google') {
                this.folderNames.sent = "[Gmail]/Sent Email"
                this.folderNames.starred = "[Gmail]/Starred"
                this.folderNames.spam = "[Gmail]/Spam"
                this.folderNames.drafts = "[Gmail]/Drafts"
                this.folderNames.archive = "[Gmail]/All Mail"
                this.folderNames.trash = "[Gmail]/Trash"
            } else {
                const allfolders = []
                const walk = folder => {
                    allfolders.push(folder.path)
                    allfolders.push(...Object.values(folder?.children).map(_ => _.path))
                }
                Object.values(folders).map(walk)
                const detectFolderName = keyword => {
                    const matches = allfolders.filter(f => f.includes(keyword))
                    if (matches.length > 0) return matches[0]
                    return ''
                }
                this.folderNames.sent = detectFolderName('Sent')
                this.folderNames.starred = detectFolderName('Star')
                this.folderNames.spam = detectFolderName('Spam') || detectFolderName('Junk')
                this.folderNames.drafts = detectFolderName('Drafts')
                this.folderNames.archive = detectFolderName('All Mail') || detectFolderName('Archive')
                this.folderNames.trash = detectFolderName('Trash') || detectFolderName('Deleted')
            }
            /////////

            // Form local boards
            this.folderNames.done = this.folderWithSlug("Done")
            const localBoards = [
                ...this.boardNames,
                this.folderNames.done
            ]
            /////////

            // Form remote boards
            const aikoFolder = folders["[Aiko Mail]"]
            // If there is no Aiko Mail folder on remote, make it
            if (!aikoFolder) {
                info(...MAILAPI_TAG, "Making the Aiko Mail folder on MX as it does not exist otherwise.")
                if (!(
                    await this.callIPC(this.task_NewFolder("[Aiko Mail]"))
                )) return window.error(...MAILAPI_TAG, "Couldn't make Aiko Mail folder on MX!")
            }
            // Collect remote boards
            const remoteBoards = Object.values(aikoFolder?.children || {}).map(_ => _.path)
            /////////

            // if there is a board locally that is not on MX, make it
            const MakeFolders = localBoards
                .filter(_ => !(remoteBoards.includes(_)))
                .map(path => this.task_NewFolder(path))
            const results = MakeFolders.length > 0 ? await this.callIPC(...MakeFolders) : []
            if (results.length != null) {
                for (let result of results) {
                    if (!(result?.path))
                        return window.error(...MAILAPI_TAG, result)
                }
            } else if (!(results?.path)) return window.error(...MAILAPI_TAG, results)
            // if there is a board on MX that is not local, make it
            this.boardNames.push(...(
                remoteBoards.filter(_ => !(localBoards.includes(_)))
            ))
            // If 'Done' is the only board locally then make a 'To-Do' board
            if (this.boardNames.length == 0) {
                info(...MAILAPI_TAG, "Making a To-Do board as it doesn't exist otherwise.")
                const todoPath = this.folderWithSlug("To-Do")
                const todoResult = await this.callIPC(this.task_NewFolder(todoPath))
                if (!todoResult || todoResult.error)
                    return window.error(...MAILAPI_TAG, "Couldn't make To-Do board:", todoResult?.error)
                this.boardNames.push(todoPath)
            }

            await SmallStorage.store(this.imapConfig.email + ':folder-names', this.folderNames)
            await SmallStorage.store(this.imapConfig.email + ':board-names', this.boardNames)
        },
        async reconnectToMailServer() {
            let results;
            if (this.connected) {
                results = await this.callIPC(
                    this.task_DisconnectFromServer(),
                    this.task_MakeNewClient(this.imapConfig),
                    this.task_ConnectToServer()
                )
            } else {
                results = await this.callIPC(
                    this.task_MakeNewClient(this.imapConfig),
                    this.task_ConnectToServer()
                )
            }
            if (results.error) {
                this.connected = false
                this.onIMAPConnectionError()
                return (this.connected = false);
            }
            return (this.connected = true)
        },
        async switchMailServer() {
            this.loading = true
            // PRECONDITION: assumes imapConfig is your new mailbox
            // CAUTION!!! this will switch the entire mailbox
            console.time("SWITCH MAILBOX")
            info(...MAILAPI_TAG, "Switching mailbox to " + this.imapConfig.email)
            if (!this.mailboxes.includes(this.imapConfig.email)) {
                this.mailboxes.push(this.imapConfig.email)
                await SmallStorage.store('mailboxes', this.mailboxes)
            }
            this.currentMailbox = this.imapConfig.email
            await SmallStorage.store('current-mailbox', this.imapConfig.email)

            // Connect to mailserver
            info(...MAILAPI_TAG, "Connecting to MX...")
            if (!(await this.reconnectToMailServer())) {
                return false
            }

            this.inbox.emails = []
            this.inbox.uidLatest = -1
            this.boardNames = []
            this.folderNames = {
                inbox: 'INBOX',
                sent: '',
                starred: '',
                spam: '',
                drafts: '',
                archive: '',
                trash: ''
            }
            await this.findFolderNames()

            info(...MAILAPI_TAG, "Loading cache...")
            // load cache for the inbox
            const inboxCache = (
                await BigStorage.load(this.imapConfig.email + '/inbox') ||
                this.inbox)
            inboxCache.emails = await MailCleaner.peek("INBOX", inboxCache.emails)
            this.inbox = inboxCache
            // load cache for the boards
            const boardCache = (
                await BigStorage.load(this.imapConfig.email + '/boards') || this.boards)
            this.boards = boardCache
            for (let board of this.boardNames) {
                if (!this.boards[board]) Vue.set(this.boards, board, {
                    uidLatest: -1,
                    emails: [],
                    //modSeq: -1,
                })
                this.boards[board].emails = await MailCleaner.peek(board, this.boards[board].emails)
                // TODO: this could easily be refactored into a map or something
                // for every email in this board
                for (let i = 0; i < this.boards[board].emails.length; i++) {
                    // check if email is in inbox
                    for (let j = 0; j < this.inbox.emails.length; j++) {
                        if (this.inbox.emails[j]?.envelope?.['message-id'] == this.boards[board].emails[i]?.envelope?.['message-id']) {
                            // link them in memory
                            const wasUID = this.inbox.emails[j].inboxUID || this.inbox.emails[j].uid
                            Vue.set(this.inbox.emails, j, this.boards[board].emails[i])
                            if (!(this.boards[board].emails[i].inboxUID)) {
                                log("changing uid to", wasUID)
                                this.boards[board].emails[i].inboxUID = wasUID
                            }
                        }
                    }
                }
            }

            info(...MAILAPI_TAG, "Saving config...")
            await this.saveIMAPConfig()

            // if there is no cache do a full sync
            info(...MAILAPI_TAG, "Checking for need to do a sync...")
            if (this.inbox.emails.length == 0) {
                await this.initialSyncWithMailServer()
            } else {
                this.inbox.uidLatest = Math.max(...this.inbox.emails.map(email => email.inboxUID || email.uid))
            }

            console.timeEnd("SWITCH MAILBOX")
            this.loading = false

            // sync boards and save their cache
            await Promise.all(
                this.boardNames.map(async boardName => await this.initialSyncBoard(boardName)))
            info(...MAILAPI_TAG, "Saving boards cache")
            await BigStorage.store(this.imapConfig.email + '/boards', this.boards)
            // FIXME: must be better way to do this
            for (let board of this.boardNames) {
                // TODO: this could easily be refactored into a map or something
                // for every email in this board
                for (let i = 0; i < this.boards[board].emails.length; i++) {
                    // check if email is in inbox
                    for (let j = 0; j < this.inbox.emails.length; j++) {
                        if (this.inbox.emails[j]?.envelope?.['message-id'] == this.boards[board].emails[i]?.envelope?.['message-id']) {
                            // link them in memory
                            const wasUID = this.inbox.emails[j].inboxUID || this.inbox.emails[j].uid
                            Vue.set(this.inbox.emails, j, this.boards[board].emails[i])
                            if (!(this.boards[board].emails[i].inboxUID)) {
                                log("Changing uid to", wasUID)
                                this.boards[board].emails[i].inboxUID = wasUID
                            }
                        }
                    }
                }
            }

            // update & check for new messages in background
            this.updateAndFetch()
        },
        async initialSyncWithMailServer() {
            info(...MAILAPI_TAG, "Performing initial sync with mailserver.")
            console.time("Initial Sync")
            this.loading = true // its so big it blocks I/O
            this.syncing = true

            const {
                uidNext
            } = await this.callIPC(this.task_OpenFolder("INBOX"))
            if (!uidNext) return window.error(...(MAILAPI_TAG), "Didn't get UIDNEXT.")

            info(...MAILAPI_TAG, "Fetching latest 100 emails from inbox.")

            let MESSAGE_COUNT = 0
            const INCREMENT = 50 // small ram bubbles
            const emails = []
            let uidMax = uidNext
            let uidMin = uidMax
            while (MESSAGE_COUNT < 100 && uidMin > 1) {
                uidMin = Math.max(uidMax - INCREMENT, 1)
                info(...MAILAPI_TAG, `Fetching ${uidMin}:${uidMax}...`)
                const received = await this.callIPC(
                    this.task_FetchEmails("INBOX", `${uidMin}:${uidMax}`, false))
                info(...MAILAPI_TAG, `Parsing...`)
                if (!(received?.reverse)) return window.error(...MAILAPI_TAG, received);
                MESSAGE_COUNT += received.length
                const processed_received = await MailCleaner.full("INBOX", received.reverse())
                emails.push(...processed_received)
                uidMax = uidMin - 1
                info(...MAILAPI_TAG, 100 - MESSAGE_COUNT, "left to fetch...")
            }

            if (!(emails?.reverse)) return window.error(...MAILAPI_TAG, emails)
            const processed_emails = emails // await MailCleaner.full(emails)

            // DANGER: this is scary and takes like 30s on main thread
            // super super dangerous, avengers level threat
            /*
            info(...MAILAPI_TAG, "Peeking 4000 additional messages for threading.")
            uidMin = Math.max(uidMax - 4000, 1)
            const thread_messages = await this.callIPC(
                this.task_FetchEmails("INBOX", `${uidMin}:${uidMax}`, true))
            if (!(thread_messages?.reverse)) return window.error(...MAILAPI_TAG, thread_messages)
            const processed_old_emails = await MailCleaner.peek(thread_messages)
            */

            this.inbox.emails = processed_emails
            if (this.inbox.emails.length > 0)
                this.inbox.uidLatest = Math.max(...this.inbox.emails.map(email => email.inboxUID || email.uid))

            // memory linking
            for (let board of this.boardNames) {
                // TODO: this could easily be refactored into a map or something
                // for every email in this board
                for (let i = 0; i < this.boards[board].emails.length; i++) {
                    // check if email is in inbox
                    for (let j = 0; j < this.inbox.emails.length; j++) {
                        if (this.inbox.emails[j]?.envelope?.['message-id'] == this.boards[board].emails[i]?.envelope?.['message-id']) {
                            // link them in memory
                            const wasUID = this.inbox.emails[j].inboxUID || this.inbox.emails[j].uid
                            Vue.set(this.inbox.emails, j, this.boards[board].emails[i])
                            if (!(this.boards[board].emails[i].inboxUID)) {
                                log("changing uid to", wasUID)
                                this.boards[board].emails[i].inboxUID = wasUID
                            }
                        }
                    }
                }
            }
            this.loading = false
            this.syncing = false
            console.timeEnd("Initial Sync")
        },
        async initialSyncBoard(boardName) {
            this.syncing = true
            // boardname should be the path!
            const board = this.boards[boardName]
            if (!board) return console.warn("Tried to sync", boardName, "but the board is not yet created.")
            let uidMin = 1
            const { uidLatest } = board
            if (uidLatest > 0) uidMin = uidLatest + 1
            const {
                uidNext
            } = await this.callIPC(this.task_OpenFolder(boardName))
            if (!uidNext || uidNext.error) return window.error(...(MAILAPI_TAG), "Didn't get UIDNEXT.")

            if (uidNext - uidMin > 50) {
                info(...MAILAPI_TAG, "There are more than 50 emails in the board. There should be a limit of 50.")
                uidMin = uidNext - 50
            }
            uidMin = Math.max(1, uidMin)

            info(...MAILAPI_TAG, `Updating ${boardName} - scanning ${uidMin}:${uidNext}`)

            const emails = await this.callIPC(
                this.task_FetchEmails(boardName, `${uidMin}:${uidNext}`, false))
            if (!emails || !(emails.reverse)) return window.error(...MAILAPI_TAG, emails)
            const processed_emails = await MailCleaner.full(boardName, emails.reverse())
            // TODO: ai should be stored in their headers automatically.

            this.boards[boardName].emails.unshift(...processed_emails)
            if (this.boards[boardName].emails.length > 0)
                this.boards[boardName].uidLatest = Math.max(...this.boards[boardName].emails.map(email => email.uid))
            success(...MAILAPI_TAG, "Finished updating", boardName)
            this.syncing = false
        },
        async syncWithMailServer() {
            // TODO: sync messages that we have locally
            // doesn't use modseq
            // i don't think we will need this so it's unwritten
            // maybe this should be specifically for syncing the
            // sent, trash, drafts etc folders to the mailserver
        },
        async updateAndFetch() {
            info(...MAILAPI_TAG, "Running update and fetch.")
            // simply checkForUpdates and checkForNewMessages both
            this.syncing = true
            await this.checkForUpdates()
            await this.checkForNewMessages()
            // we can call initial sync board here
            // only because it only checks for new emails
            // uids are consecutive, i.e. its unlikely/impossible
            // for something to be unsynced older than latest
            // (unsynced here = not present, flags are synced
            //  separately through checkForUpdates for boards)
            await Promise.all(this.boardNames.map(n => this.initialSyncBoard(n)))
            //await this.halfThreading()
            this.syncing = false
        },
        async checkForNewMessages() {
            const {
                uidNext
            } = await this.callIPC(this.task_OpenFolder("INBOX"))
            if (!uidNext) return window.error(...(MAILAPI_TAG), "Didn't get UIDNEXT.")

            if (this.inbox.uidLatest < 0 || uidNext - this.inbox.uidLatest > 50) {
                info(...MAILAPI_TAG, "There are too many emails to update, need to sync.")
                // TODO: probably show a modal since this is blocking
                await this.initialSyncWithMailServer()
                return false
            }

            this.inbox.uidLatest = Math.max(...this.inbox.emails.map(email => email.inboxUID || email.uid))
            info(...MAILAPI_TAG, `Updating inbox - scanning ${this.inbox.uidLatest + 1}:${uidNext}`)

            const emails = await this.callIPC(
                this.task_FetchEmails("INBOX", `${this.inbox.uidLatest + 1}:${uidNext}`, false))
            if (!emails || !(emails.reverse)) return window.error(...MAILAPI_TAG, emails)
            const processed_emails = await MailCleaner.full("INBOX", emails.reverse())

            if (processed_emails.length > 3) {
                new window.Notification(processed_emails.length + " new emails", {
                    body: "You received " + processed_emails + " new messages, click here to view them.",
                    icon: "https://helloaiko.com/mail/images/icon-download.png",
                    badge: "https://helloaiko.com/mail/images/icon-download.png",
                    timestamp: new Date(),
                    tag: "Aiko Mail"
                })
            } else {
                processed_emails.map(email => {
                    new window.Notification(email?.envelope?.from[0]?.name || email?.envelope?.from[0]?.address, {
                        body: email?.envelope?.subject + '\n' + email?.parsed?.text,
                        icon: "https://helloaiko.com/mail/images/icon-download.png",
                        badge: "https://helloaiko.com/mail/images/icon-download.png",
                        timestamp: email?.envelope?.date,
                        tag: "Aiko Mail"
                    })
                })
            }

            this.inbox.emails.unshift(...processed_emails)
            if (this.inbox.emails.length > 0)
                this.inbox.uidLatest = Math.max(...this.inbox.emails.map(email => email.inboxUID || email.uid))

            // memory linking
            for (let board of this.boardNames) {
                // TODO: this could easily be refactored into a map or something
                // for every email in this board
                for (let i = 0; i < this.boards[board].emails.length; i++) {
                    // check if email is in inbox
                    for (let j = 0; j < this.inbox.emails.length; j++) {
                        if (this.inbox.emails[j]?.envelope?.['message-id'] == this.boards[board].emails[i]?.envelope?.['message-id']) {
                            // link them in memory
                            const wasUID = this.inbox.emails[j].inboxUID || this.inbox.emails[j].uid
                            Vue.set(this.inbox.emails, j, this.boards[board].emails[i])
                            if (!(this.boards[board].emails[i].inboxUID)) {
                                log("Chanign guid to", wasUID)
                                this.boards[board].emails[i].inboxUID = wasUID
                            }
                        }
                    }
                }
            }
        },
        async checkForUpdates() {
            info(...MAILAPI_TAG, "Checking for updates to existing emails.")
            //const getChanges = async (modseq, folder, uids) => {
            const getChanges = async (folder, uids) => {
                    const changes = {}
                // FIXME: disabled modseq as gmail doesnt support condstore anymore
                // check folder modseq
                //const { highestModseq } = await this.callIPC(this.task_OpenFolder(folder))
                //if (modseq < 0) modseq = highestModseq
                // if the modseq doesnt match something changed
                //if (modseq != highestModseq) {
                    // calc min/max, dont reuse bc sanity check
                    const uidMax = Math.max(...uids, 1)
                    const uidMin = Math.min(...uids, uidMax)
                    // get changes, only need peek
                    const changedEmails = await this.callIPC(
                        this.task_FetchEmails(folder,
                            `${uidMin}:${uidMax}`, true,
                            //modseq
                    ))
                    // populate changes with uid => flags
                    changedEmails.map(e => changes[e.uid] = e.flags)
                //}
                //return {changes, highestModseq}
                return changes
            }

            // check inbox
            const inboxDelta = await getChanges(
                //this.inbox.modSeq,
                this.folderNames.inbox,
                this.inbox.emails.filter(e => e.folder == "INBOX").map(e => e.inboxUID || e.uid)
            )
            info(...MAILAPI_TAG, "Computed inbox delta.")
            // update the inbox
            //this.inbox.modSeq = inboxDelta.highestModseq
            this.inbox.emails = await Promise.all(this.inbox.emails.map(
                async email => {
                    if (inboxDelta[email.uid]) {
                        const flags = inboxDelta[email.uid]
                        Object.assign(email.flags, flags)
                        email.ai.seen = flags.includes('\\Seen')
                        email.ai.deleted = flags.includes('\\Deleted')
                    } else if (email.folder == 'INBOX') {
                        email.ai.deleted = true
                    }
                    return email
                }
            ))
            info(...MAILAPI_TAG, "Synced inbox messages with remote flags.")

            // update boards
            for (let board of this.boardNames) {
                // check board
                const boardDelta = await getChanges(
                    //this.boards[board].modSeq,
                    board,
                    this.boards[board].emails.filter(e => e.folder == board).map(e => e.uid)
                )
                info(...MAILAPI_TAG, "Computed", board, "delta")
                // update the board
                //this.boards[board].modSeq = boardDelta.highestModseq
                this.boards[board].emails = (await Promise.all(this.boards[board].emails.map(
                    async email => {
                        if (boardDelta[email.uid]) {
                            const flags = boardDelta[email.uid]
                            email.flags = flags
                            email.ai.seen = flags.includes('\\Seen')
                            email.ai.deleted = flags.includes('\\Deleted')
                        } else if (email.folder == board) {
                            return null
                        }
                        return email
                    }
                ))).filter(_=>_)
                info(...MAILAPI_TAG, "Synced", board, "messages with remote flags.")
            }
            // cache boards
            await BigStorage.store(this.imapConfig.email + '/boards', this.boards)
        },
        async getOldMessages() {
            if (this.inbox.emails.length <= 0) {
                info(...MAILAPI_TAG, "There are no emails to begin with, you should call a full sync.")
                return false
            }

            const uidOldest = this.inbox.emails.last()?.uid
            if (!uidOldest) return window.error("Couldn't identify oldest UID.")
            const uidMin = Math.max(0, uidOldest - 50)

            info(...MAILAPI_TAG, `Seeking history - last 50 messages (${uidMin}:${uidOldest})`)

            const emails = await this.callIPC(
                this.task_FetchEmails("INBOX", `${uidMin}:${uidOldest}`, false))
            if (!emails || !(emails.reverse)) return window.error(...MAILAPI_TAG, emails)
            const processed_emails = await MailCleaner.base("INBOX", emails.reverse())

            this.inbox.emails.push(...processed_emails)
        },
        async uploadMessage(path, message, headerData, customData) {
            info(...MAILAPI_TAG, "Uploading a message to", path)
            return window.error(...MAILAPI_TAG, "We disabled upload message because it duplicates messages when threading is activated.")

            if (path == "INBOX")
                return window.error(...MAILAPI_TAG, "Don't upload messages to the inbox.")

            const to_upload = Object.assign({}, message);

            // NOTE: body[] is no longer included
            // you'll need to remove it
            // data is stringified and base64 encoded
            // to parse it you'll have to atob and JSON.parse
            // for attachments you have to add an = after decoding the uint8array before enc
            // for that purpose there is a specific method for dealing with attachments below this one
            to_upload['body[]'] = "X-Aiko-Mail: " + btoa(JSON.stringify(headerData)) + '\r\n' + to_upload['body[]']
            const data = btoa(JSON.stringify(customData || {}))

            const boundary = to_upload['bodystructure']['parameters']['boundary']
            const lines = to_upload['body[]'].trim().split('\n')
            const ending = lines.splice(lines.length - 1, 1)[0] + '\n'
            const splitter = ending.split(boundary)[0]
            to_upload['body[]'] = lines.join('\n');
            to_upload['body[]'] += '\r\n\r\n\r\n' + splitter + boundary + '\r\n'
            // use fake ass mimetype to make gmail ignore it
            to_upload['body[]'] += `Content-Type: aiko/data; charset="UTF-8"\r\n`
            to_upload['body[]'] += `Content-Transfer-Encoding: quoted-printable\r\n`
            to_upload['body[]'] += `\r\n`
            to_upload['body[]'] += data
            to_upload['body[]'] += '\r\n' + ending

            return await app.callIPC(app.task_UploadEmail(path, to_upload['body[]']))
        },
        parseAikoDataAttachment(att_content) {
            att_content = new Uint8Array(Object.values(att_content))
            const enc = new TextDecoder("utf-8").decode(att_content)
            return JSON.parse(atob(enc + "="))
        },
        async getThread(email) {
            // returns thread array for email
            // NOTE: threads are peeked!
            // TODO: write a non-peeked version
            // FIXME: this doesn't completely work
            // for example it breaks with concurrent replies
            // and if someone replies to a message that wasn't sent to you
            // then it breaks as well.
            // would help to match subjects as well,
            // and then to include the subject

            if (email?.parsed?.thread) return email.parsed.thread

            // thread will not include the current message.
            // this creates a circular structure. big no!
            let thread = []

            const get_reply = async reply_id => {
                // search local
                for (let i = 0; i < this.inbox.emails.length; i++) {
                    const email = this.inbox.emails[i]
                    if (email.envelope['message-id'] == reply_id) {
                        this.inbox.emails[i].ai.threaded = true
                        if (email?.parsed?.thread?.messages)
                            return [email, ...email?.parsed?.thread?.messages]
                        return [email]
                    }
                }
                for (let board of this.boardNames) {
                    for (let i = 0; i < this.boards[board].emails.length; i++) {
                        const email = this.boards[board].emails[i]
                        if (email.envelope['message-id'] == reply_id) {
                            this.boards[board].emails[i].ai.threaded = true
                            if (email?.parsed?.thread?.messages)
                                return [email, ...email?.parsed?.thread?.messages]
                            return [email]
                        }
                    }
                }
                // TODO: check sent

                // search old emails
                /*
                for (let email of this.inbox.oldEmails) {
                    if (email.envelope['message-id'] == reply_id)
                        return email
                }*/

                // TODO: can check references
                // almost every imap server returns references
                // easier than checking message id iteratively
                const search_results = await this.callIPC(
                    this.task_SearchEmails(app.folderNames.archive, {
                        header: [
                            'Message-ID', reply_id
                        ]
                    })
                )
                if (search_results.length > 0) {
                    const email = await this.callIPC(this.task_FetchEmails(
                        this.folderNames.archive,
                        search_results[0],
                        true
                    ))
                    if (email.length > 0) return email
                }
                // TODO: check... trash maybe? idk

                return []
            }

            let reply_id = email.envelope['in-reply-to']
            const reply_ids = new Set()

            while (reply_id && !(reply_ids.has(reply_id))) {
                info(...MAILAPI_TAG, "Threading: ", reply_id)
                reply_ids.add(reply_id)
                let reply = await get_reply(reply_id)
                reply_id = null
                if (reply.length > 0) {
                    reply = reply.map(msg => {
                        msg.parsed = null
                        return msg
                    })
                    thread.push(...reply)
                    reply_id = reply?.last()?.envelope?.['in-reply-to']
                }
            }
            thread = thread.map(msg => {
                msg.parsed = null
                return msg
            })

            const getSender = email => {
                return email?.envelope?.from?.[0]?.name || email?.envelope?.from?.[0]?.address || ''
            }

            return {messages: thread, senders: thread.map(getSender)}
        },
        async halfThreading() {
            // does the very simple act of:
            // email.ai.isInThread = true
            // on emails that are part of a thread
            // and not the final msg in thread
            // only on emails that we have locally

            const reply_ids = new Set()

            // thread everything that has a thread
            for (let i = 0; i < this.inbox.emails.length; i++) {
                const email = this.inbox.emails[i]
                const reply_id = email?.envelope?.['in-reply-to']
                if (reply_id) {
                    reply_ids.add(reply_id)
                    this.inbox.emails[i].ai.thread = true;
                    if (!this.inbox.emails[i].parsed.thread && !this.inbox.emails[i].ai.threaded) {
                        this.inbox.emails[i].parsed.thread =
                            await this.getThread(this.inbox.emails[i]);
                    }
                }
            }
            for (let boardName of this.boardNames) {
                for (let i = 0; i < this.boards[boardName].emails.length; i++) {
                    const email = this.boards[boardName].emails[i]
                    const reply_id = email?.envelope?.['in-reply-to']
                    if (reply_id) {
                        reply_ids.add(reply_id)
                        this.boards[boardName].emails[i].ai.thread = true
                        if (!this.boards[boardName].emails[i].parsed.thread && !this.boards[boardName].emails[i].ai.threaded) {
                            this.boards[boardName].emails[i].parsed.thread =
                                await this.getThread(this.boards[boardName].emails[i]);
                        }
                    }
                }
            }

            // mark threaded emails as threaded
            for (let i = 0; i < this.inbox.emails.length; i++) {
                const email = this.inbox.emails[i]
                const msgId = email?.envelope?.['message-id'];
                if (msgId && reply_ids.has(msgId)) {
                    this.inbox.emails[i].ai.threaded = true
                }
            }
            for (let boardName of this.boardNames) {
                for (let i = 0; i < this.boards[boardName].emails.length; i++) {
                    const email = this.boards[boardName].emails[i]
                    const msgId = email?.envelope?.['message-id'];
                    if (msgId && reply_ids.has(msgId)) {
                        this.boards[boardName].emails[i].ai.threaded = true
                    }
                }
            }

            info(...MAILAPI_TAG, "Finished threading")
            // save cache
            await BigStorage.store(this.imapConfig.email + '/inbox', {
                uidLatest: this.inbox.uidLatest,
                //modSeq: this.inbox.modSeq,
                emails: this.inbox.emails.slice(0,90)
            })
            await BigStorage.store(app.imapConfig.email + '/boards', app.boards)
        },
        checkMove({to, from, draggedContext}) {
            // prevents moving from&to inbox
            // this is buggy because the vue.draggable lib is trash
            // so we dont use it anymore :/
            /*
            if (to.id == from.id && to.id == "aikomail--inbox") {
                info(...MAILAPI_TAG, "Cancelled move; to id:", to.id, "from id:", from.id)
                return false
            }
            */
            return true
        },
        cloneEmail({item, clone}) {
            // you can do mail management on the "original"
            // which is the HTML element for email in `item`
            // and also clone which is the cloned email's
            // corresponding HTML element
            clone.classList.toggle('cloned', true)
        },
        async moveEmail({to, from, item, oldIndex, newIndex}) {
            // TODO: calculating index should use message id
            const uid = item.getAttribute('uid')

            // ignore from-to same board
            if (from.id == to.id) {
                item.classList.toggle('cloned', false)
                return;
            }

            // 2 types of events, to inbox and to board
            // to inbox
            if (to.id == 'aikomail--inbox') {
                let email, index;
                for (let i = 0; i < app.inbox.emails.length; i++) {
                    if (app.inbox.emails[i].uid == uid) {
                        email = app.inbox.emails[i]
                        index = i
                        break
                    }
                }
                if (!email) return window.error(...MAILAPI_TAG, "Couldn't find an email with that UID in the inbox.")

                // if its mid sync use that folder, otherwise its normal folder
                const folder = email.syncFolder || email.folder
                // update UI right away
                email.folder = "INBOX"
                // remove to prevent clones
                log(index)
                app.inbox.emails.splice(index, 1)

                // if mid sync from inbox, can ignore
                // otherwise just delete the email from its board
                if (folder != "INBOX") {
                    info(...MAILAPI_TAG, "Deleting email", email.uid, "from", folder)
                    await app.callIPC(app.task_DeleteEmails(
                        folder, email.uid
                    ))
                }

                email.uid = email.inboxUID || email.uid
            }
            // to board
            else {
                // add to board ids
                // get board name
                const boardName = to.id.substring('aikomail--'.length)
                // could also use:
                // to.parentElement.parentElement.getAttribute('board-name')
                // get email, calculate index ourselves
                let email;
                for (let i = 0; i < app.boards[boardName].emails.length; i++) {
                    if (app.boards[boardName].emails[i].uid == uid) {
                        email = app.boards[boardName].emails[i]
                        break
                    }
                }
                if (!email) return window.error(...MAILAPI_TAG, "Couldn't find an email with that UID in the board.")

                info(...MAILAPI_TAG, "Dragged", email.uid,
                    "of", (email.syncFolder || email.folder),
                    "from", from.id, "to", to.id
                )

                // if this is the first movement of the email
                // since it was last synced to mailserver,
                // set the folder it originated from
                if (!email.syncFolder) email.syncFolder = email.folder
                // update UI right away though!
                email.folder = boardName

                // Sync
                // TODO: make hash to signify this sync and store in email
                const targetFolder = email.folder
                const SYNC_TIMEOUT = 3000
                setTimeout(async () => {
                    // if it's already syncing, don't race
                    if (email.syncing) return info(...MAILAPI_TAG, "Cancelled move to", targetFolder, "because it was syncing already.");
                    // if the email's folder has changed, don't race
                    if (email.folder != targetFolder) return info(...MAILAPI_TAG, "Cancelled move to", targetFolder, "because the target folder is", email.folder);
                    // if there's no sync folder, there's an issue
                    if (!email.syncFolder) return window.error(...MAILAPI_TAG, "There's no sync folder", email)
                    // lock email in UI
                    email.syncing = true // TODO: should add a class that exists in draggable filter
                    info(...MAILAPI_TAG, "Moving email",
                        email.uid, "from", email.syncFolder,
                        "to", targetFolder
                    )
                    // if it comes from inbox copy,
                    // otherwise move it (move it)
                    const syncStrategy = (
                        (email.syncFolder == "INBOX") ?
                            app.task_CopyEmails : app.task_MoveEmails
                    );
                    info(...MAILAPI_TAG, "Using sync strategy", syncStrategy.name)
                    if (email.syncFolder == 'INBOX') email.inboxUID = email.inboxUID || email.uid
                    // do the actual copy/move
                    const d = await app.callIPC(syncStrategy(
                        email.syncFolder, email.folder,
                        email.syncFolder == 'INBOX' ? email.inboxUID : email.uid
                    ))
                    const destSeqSet = d?.destSeqSet;
                    if (!destSeqSet) return window.error(...MAILAPI_TAG, "Couldn't get destination UID", d, email);
                    // TODO: should probably move it back if we failed
                    info(...MAILAPI_TAG, "Moved email",
                        email.uid, "from", email.syncFolder,
                        "to", targetFolder, "with new uid",
                        destSeqSet
                    )

                    // make sure we set the current folder/uid pair
                    // and this eval is why we check integrity of IPC :)
                    email.uid = eval(destSeqSet)
                    email.folder = targetFolder
                    // clean up post-sync
                    email.syncing = false
                    email.syncFolder = null
                    if (app.boards[boardName].emails.length > 0)
                        app.boards[boardName].uidLatest = Math.max(...app.boards[boardName].emails.map(email => email.uid))
                    info(...MAILAPI_TAG, "Saving boards cache")
                    await BigStorage.store(this.imapConfig.email + '/boards', this.boards)
                    info(...MAILAPI_TAG, "Saving inbox cache...")
                    await BigStorage.store(this.imapConfig.email + '/inbox', {
                        uidLatest: this.inbox.uidLatest,
                        //modSeq: this.inbox.modSeq,
                        emails: this.inbox.emails.slice(0,90)
                    })
                    info(...MAILAPI_TAG, "Saved inbox cache.")
                }, SYNC_TIMEOUT)
            }
            // TODO: special for done? idk
            info(...MAILAPI_TAG, "Saving boards cache")
            await BigStorage.store(this.imapConfig.email + '/boards', this.boards)
        },
    }
}

window.setInterval(async () => {
//    await app.updateAndFetch()
}, 30 * 1000)
Notification.requestPermission()