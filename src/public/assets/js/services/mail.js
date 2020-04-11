const mailapi = {
    data: {
        TAG: ["%c[MAIL API]", "background-color: #ffdddd; color: #000;"],

        connected: false,
        imapConfig: {
            host: '',
            port: 993,
            user: '',
            pass: '',
            xoauth2: '',
            secure: true
        },
    },
    methods: {
        async initIMAP() {
            ipcRenderer.on('email was deleted',
                (_, {path, seq}) => app.onDeleteEmail(path, seq));
            ipcRenderer.on('exists value changed',
                (_, {path, seq}) => app.onSyncRequested(path, seq));
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
        // Utility methods
        folderWithSlug(slug) {
            return `"[Aiko Mail (DO NOT DELETE)]/${slug}"`
        },
        // Email Management
                /*
        const {message} = await this.callIPC(
            this.ipcTask('please echo', {message: "foo"})
        )

        For batch tasks:
        const results = await this.callIPC(
            this.ipcTask('please echo', {message: "hello"}),
            this.ipcTask('please echo', {message: "world"})
        )
        console.log(results[0].message) // "hello"
        console.log(results[1].message) // "world"
        */
        async switchMailServer() {
            // PRECONDITION: assumes imapConfig is your new mailbox
            if (this.connected) {
                const results = await this.callIPC(
                    this.task_DisconnectFromServer(),
                    this.task_MakeNewClient(this.imapConfig),
                    this.task_ConnectToServer()
                )
                this.connected = true
            } else {
                const results = await this.callIPC(
                    this.task_DisconnectFromServer(),
                    this.task_MakeNewClient(this.imapConfig),
                    this.task_ConnectToServer()
                )
                this.connected = true
            }
        }
    }
}