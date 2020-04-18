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
            inbox: "INBOX",

        },
        inbox: {
            uidLatest: -1,
            emails: [],
        },
        done: {
            uidLatest: -1,
            emails: [],
        },
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
                (_, {path, seq}) => app.onDeleteEmail(path, seq))
            ipcRenderer.on('exists value changed',
                (_, {path, seq}) => app.onSyncRequested(path, seq))
            info(...MAILAPI_TAG, "Loading address cache...")
            this.mailboxes = (await SmallStorage.load('mailboxes')) || [];
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
            return this.ipcTask('please make a new folder', {path,})
        },
        task_DeleteFolder(path) {
            return this.ipcTask('please delete a folder', {path,})
        },
        task_OpenFolder(path) {
            return this.ipcTask('please open a folder', {path,})
        },
        task_FetchEmails(path, sequence, peek) {
            return this.ipcTask('please get emails', {
                path, sequence, peek
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
            return this.ipcTask('please look for emails', { path, query })
        },
        task_SetFlags(path, sequence, flags) {
            // there is a non-blind version of this that returns the emails
            // just set blind: false in the payload
            return this.ipcTask('please set email flags', {
                path, sequence, flags,
                blind: true
            })
        },
        task_DeleteEmails(path, sequence) {
            return this.ipcTask('please delete emails', { path, sequence })
        },
        task_CopyEmails(srcPath, dstPath, sequence) {
            return this.ipcTask('please copy emails', {
                srcPath, dstPath, sequence
            })
        },
        task_MoveEmails(srcPath, dstPath, sequence) {
            return this.ipcTask('please move emails', {
                srcPath, dstPath, sequence
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
            // TODO: caching
            if (this.imapConfig.provider == 'google') {
                this.folderNames.inbox = "INBOX"
                this.folderNames.sent = "[Gmail]/Sent Email"
                this.folderNames.starred = "[Gmail]/Starred"
                this.folderNames.spam = "[Gmail]/Spam"
                this.folderNames.drafts = "[Gmail]/Drafts"
                this.folderNames.archive = "[Gmail]/All Mail"
                this.folderNames.trash = "[Gmail]/Trash"
            }
            else {
                // TODO: default detection of folder names
            }


            // Sync board folders
            this.folderNames.done = this.folderWithSlug("Done")
            const folders = await this.callIPC(this.task_ListFolders())
            if (!folders || !(typeof folders == "object")) return window.error(...MAILAPI_TAG, folders)
            const aikoFolder = folders["[Aiko Mail]"]
            if (aikoFolder) {
                this.folderNames.boards = Object
                    .values(aikoFolder.children).map(_ => _.path)
            }

            // TODO: sync
            // if there is a board locally that is not on MX, make it
            // if there is a board on MX that is not local, make it
            // if board exists on cloud then overwrite local with cloud
            // if board does not exist on cloud then create it
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
            // PRECONDITION: assumes imapConfig is your new mailbox
            // CAUTION!!! this will switch the entire mailbox
            info(...MAILAPI_TAG, "Switching mailbox to " + this.imapConfig.email)
            if (!this.mailboxes.includes(this.imapConfig.email)) {
                this.mailboxes.push(this.imapConfig.email)
                await SmallStorage.store('mailboxes', this.mailboxes)
            }
            this.currentMailbox = this.imapConfig.email
            await SmallStorage.store('current-mailbox', this.imapConfig.email)

            // TODO: load folder names
            this.folderNames.inbox = 'INBOX'

            // TODO: empty everything
            this.inbox.emails = []
            this.done.emails = []

            // TODO: load cache for email
            info(...MAILAPI_TAG, "Loading cache...")
            const inboxCache = (
                await BigStorage.load(this.imapConfig.email + ':inbox')
                || this.inbox)
            inboxCache.emails = inboxCache.emails.map(email => {
                // TODO: this should also be a function that turns properties into
                // objects that could not be stored as is
                email.envelope.date = new Date(email.envelope.date)
                return email
            })
            this.inbox = inboxCache

            // Connect to mailserver
            info(...MAILAPI_TAG, "Connecting to MX...")
            if (!(await this.reconnectToMailServer())) {
                return false
            }
            info(...MAILAPI_TAG, "Saving config...")
            await this.saveIMAPConfig()

            // if there is no cache do a full sync
            info(...MAILAPI_TAG, "Checking for need to do a sync...")
            if (this.inbox.emails.length == 0) {
                await this.initialSyncWithMailServer()
            }
        },
        async initialSyncWithMailServer() {
            info(...MAILAPI_TAG, "Performing initial sync with mailserver.")
            this.loading = true // its so big it blocks I/O
            const { uidNext } = await this.callIPC(this.task_OpenFolder("INBOX"))
            if (!uidNext) return window.error(...(MAILAPI_TAG), "Didn't get UIDNEXT.")
            const uidMin = Math.max(uidNext - 100, 0) // fetch latest 100
            info(...MAILAPI_TAG, "Fetching latest 100 emails from inbox.")
            const emails = await this.callIPC(
                this.task_FetchEmails("INBOX", `${uidMin}:${uidNext}`, false))
            if (!emails || !(emails.reverse)) return window.error(...MAILAPI_TAG, emails)
            const processed_emails = emails
                .reverse()
                .map(email => {
                    // FIXME: this should be a function that parses emails
                    email.envelope.date = new Date(email.envelope.date)
                    email.ai = {
                        subscription: false,
                        unsubscribeLink: '',
                        seen: false
                    }
                    email.parsed.headerLines.map(({key, line}) => {
                        if (key == 'list-unsubscribe') {
                            const urls = line.match(/(http:\/\/|mailto:|https:\/\/)[^>]*/gim)
                            if (urls && urls.length > 0) {
                                email.ai.subscription = true
                                email.ai.unsubscribeLink = urls[0]
                            }
                            else console.log("LIST-UNSUBSCRIBE", line)
                        }
                    })
                    if (email.flags.includes('\\Seen')) email.ai.seen = true
                    return email
                })
            // we should call AI on priority inbox for this but
            // probably upload stuff en masse.... which means we
            // need batch prediction!!
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
            if (this.uidLatest < 0 || this.uidNext - this.uidLatest > 50) {
                await this.initialSyncWithMailServer()
                return false
            }
            // TODO: fetch uidLatest:uidNext
        },
        async checkForUpdates() {
            // TODO: using modseq???????
        },
        async getOldMessages() {
            // TODO: fetch like... 50 messages older
            // don't call AI on them. old messages can smd
        },

    }
}