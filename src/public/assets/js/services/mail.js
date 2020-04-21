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
            emails: [],
        },
        boards: {}
    },
    watch: {
        'inbox.emails': async function (updatedInbox) {
            // NOTE: important to check length
            // dont want to store empty inbox if it is reset
            // if you need to store an empty inbox do it manually!
            if (updatedInbox.length > 0) {
                info(...MAILAPI_TAG, "Saving inbox cache")
                await BigStorage.store(this.imapConfig.email + ':inbox',
                    this.inbox)
            }
        },
    },
    computed: {
        priorityInbox() {
            return (this.inbox.emails || this.inbox).filter(email => !email.ai.subscription)
        }
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
        task_FetchEmails(path, sequence, peek) {
            return this.ipcTask('please get emails', {
                path,
                sequence,
                peek
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
                const detectFolderName = keyword => {
                    const matches = folders.filter(f => f.includes(keyword))
                    if (matches.length > 0) return matches[1]
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
                await BigStorage.load(this.imapConfig.email + ':inbox') ||
                this.inbox)
            inboxCache.emails = await MailCleaner.peek(inboxCache.emails)
            this.inbox = inboxCache
            // load cache for the boards
            const boardCache = (
                await BigStorage.load(this.imapConfig.email + ':boards') || this.boards)
            this.boards = boardCache

            info(...MAILAPI_TAG, "Saving config...")
            await this.saveIMAPConfig()

            // if there is no cache do a full sync
            info(...MAILAPI_TAG, "Checking for need to do a sync...")
            if (this.inbox.emails.length == 0) {
                await this.initialSyncWithMailServer()
            } else {
                this.inbox.uidLatest = this.inbox.emails[0].uid
            }
            console.timeEnd("SWITCH MAILBOX")
            this.loading = false
        },
        async initialSyncWithMailServer() {
            info(...MAILAPI_TAG, "Performing initial sync with mailserver.")
            this.loading = true // its so big it blocks I/O

            const {
                uidNext
            } = await this.callIPC(this.task_OpenFolder("INBOX"))
            if (!uidNext) return window.error(...(MAILAPI_TAG), "Didn't get UIDNEXT.")
            const uidMin = Math.max(uidNext - 100, 0) // fetch latest 100

            info(...MAILAPI_TAG, "Fetching latest 100 emails from inbox.")

            const emails = await this.callIPC(
                this.task_FetchEmails("INBOX", `${uidMin}:${uidNext}`, false))
            if (!emails || !(emails.reverse)) return window.error(...MAILAPI_TAG, emails)
            const processed_emails = await MailCleaner.full(emails.reverse())

            this.inbox.emails = processed_emails
            if (this.inbox.emails.length > 0)
                this.uidLatest = this.inbox.emails[0].uid
            this.loading = false
        },
        async syncWithMailServer() {
            // TODO: sync messages that we have locally
            // we only need to peek the headers for this!
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

            info(...MAILAPI_TAG, `Updating inbox - scanning ${this.inbox.uidLatest + 1}:${uidNext}`)

            const emails = await this.callIPC(
                this.task_FetchEmails("INBOX", `${this.inbox.uidLatest + 1}:${uidNext}`, false))
            if (!emails || !(emails.reverse)) return window.error(...MAILAPI_TAG, emails)
            const processed_emails = await MailCleaner.full(emails.reverse())

            this.inbox.emails.unshift(...processed_emails)
            if (this.inbox.emails.length > 0)
                this.inbox.uidLatest = this.inbox.emails[0].uid
        },
        async checkForUpdates() {
            // TODO: using modseq???????
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
            const processed_emails = await MailCleaner.base(emails.reverse())

            this.inbox.emails.push(...processed_emails)
        }
    }
}