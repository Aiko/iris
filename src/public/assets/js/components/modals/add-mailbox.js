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
            },
            smtpConfig: {
                email: '',
                host: '',
                port: 587,
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
            this.smtpConfig.host = 'outlook.office365.com'
            this.smtpConfig.port = 587
            this.smtpConfig.provider = 'microsoft'
            this.step = 2
        },
        async addOther() {
            this.step = 2
        },
        async testIMAP() {
            const testConnection = await app.ipcTask('please test a connection', {
                ...this.imapConfig
            })
            const { valid, error } = await app.callIPC(testConnection).catch(_=>_)

            if (error || !valid) {
                this.error = "We couldn't connect to your mail server. Please check your credentials or contact your administrator."
                return false
            }
            else {
                this.error = ''
                this.imapConfig.email = this.imapConfig.user
                this.smtpConfig.email = this.imapConfig.email
                this.smtpConfig.provider = this.imapConfig.provider
                this.smtpConfig.user = this.imapConfig.user
                this.smtpConfig.pass = this.imapConfig.pass
                this.smtpConfig.xoauth2 = this.imapConfig.xoauth2
                this.smtpConfig.secure = this.imapConfig.secure
                return true
            }
        },
        async testSMTP() {
            const testConnection = await app.ipcTask('please test SMTP connection', {
                ...this.smtpConfig
            })
            const { valid, error } = await app.callIPC(testConnection).catch(_=>_)

            if (error || !valid) {
                this.error = "We couldn't verify your SMTP details. Please check your credentials or contact your administrator."
                return false
            }
            else {
                this.error = ''
                this.smtpConfig.email = this.smtpConfig.user
                return true
            }
        },
        async saveConfig() {
            this.loading = true
            if (!(await this.testIMAP())) {
                window.error(...MODALS_TAG, "IMAP test failed.")
                return (this.loading = false);
            }
            if (!(await this.testSMTP())) {
                window.error(...MODALS_TAG, "SMTP test failed.")
                return (this.loading = false);
            }
            app.imapConfig = this.imapConfig
            app.smtpConfig = this.smtpConfig
            this.success()
            this.closable = true
            this.close()
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