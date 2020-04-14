Vue.component('add-mailbox-modal', {
    props: [
        'googlestrategy',
        'success', // NOTE: success should be async
        'closable'
    ],
    data() {
        return {
            step: 1,
            error: '',
            loading: false,
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
            if (await this.googlestrategy()) {
                this.success()
                this.closable = true
                this.close()
            }
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
            this.loading = true
            const {
                host, port, user, pass, xoauth2, secure
            } = this.imapConfig
            const testConnection = await app.ipcTask('please test a connection', {
                host, port, user, pass, xoauth2, secure
            })
            const { valid, error } = await app.callIPC(testConnection).catch(_=>_)
            if (error || !valid) {
                this.error = "We couldn't connect to your mail server. Please check your credentials or contact your administrator."
                this.loading = false
            }
            else {
                this.error = ''
                this.imapConfig.email = this.imapConfig.user
                app.imapConfig = this.imapConfig
                this.success()
                this.closable = true
                this.close()
            }
        },
        async close() {
            if (this.closable)
                app.addMailbox = false
        },
        async back() {
            this.step = 1
        }
    }
})