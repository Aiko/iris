Vue.component('add-mailbox-modal', {
    props: [
        'googlestrategy',
        'success'
    ],
    data() {
        return {
            step: 1,
            error: '',
            imapConfig: {
                email: '',
                host: '',
                port: 993,
                user: '',
                pass: '',
                xoauth2: '',
                secure: true,
                provider: 'other'
            }
        }
    },
    methods: {
        async addGoogle() {
            if (await this.googlestrategy()) this.success()
        },
        async addMicrosoft() {
            this.imapConfig.host = 'outlook.office365.com'
            this.imapConfig.port = 993
            this.imapConfig.provider = 'microsoft'
            this.step = 2
        },
        async addOther() {
            this.step = 2
        },
        async saveConfig() {
            const {
                host, port, user, pass, xoauth2, secure
            } = this.imapConfig
            const testConnection = await app.ipcTask('please test a connection', {
                host, port, user, pass, xoauth2, secure
            })
            const { valid, error } = await app.callIPC(testConnection)
            if (error || !valid) {
                this.error = error
            }
            else this.success()
        },
        async close() {
            if (!app.forceAddMailbox)
                app.addMailbox = false
        },
        async back() {
            this.step = 1
        }
    }
})