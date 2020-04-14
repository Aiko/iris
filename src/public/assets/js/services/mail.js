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
        uidLatest: -1,
        uidNext: -1,
    },
    methods: {
        async initIMAP() {
            ipcRenderer.on('email was deleted',
                (_, {path, seq}) => app.onDeleteEmail(path, seq))
            ipcRenderer.on('exists value changed',
                (_, {path, seq}) => app.onSyncRequested(path, seq))
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
            this.loadIMAPConfig(currentEmail)
            // TODO: load cache for mailbox

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
            return `"[Aiko Mail (DO NOT DELETE)]/${slug}"`
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
            if (!(await this.reconnectToMailServer())) {
                return false
            }
            await this.saveIMAPConfig()
            if (!this.mailboxes.includes(this.imapConfig.email)) {
                this.mailboxes.push(this.imapConfig.email)
                await SmallStorage.store('mailboxes', this.mailboxes)
            }
            this.currentMailbox = this.imapConfig.email
            await SmallStorage.store('current-mailbox', this.imapConfig.email)
            // TODO: load cache for email
            // TODO: if there is no cache do a full sync
        },
        async initialSyncWithMailServer() {
            // TODO: fetch like 200 messages or some shit
            // we should call AI on priority inbox for this but
            // probably upload stuff en masse.... which means we
            // need batch prediction!!
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