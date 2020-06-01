const COMPOSER_TAG = ["%c[COMPOSER]", "background-color: #b7c4a3; color: #000;"]

const composer = {
    data: {
        smtpConfig: {
            email: '',
            host: '',
            port: 587,
            user: '',
            pass: '',
            xoauth2: '',
            secure: true,
            provider: 'other'
        },
    },
    created() {
        info(...COMPOSER_TAG, "Mounted composer mixin. Please ensure this only ever happens once.")
    },
    methods: {
        async initSMTP() {
            info(...COMPOSER_TAG, "Loading address cache...")
            const mailboxes = (await SmallStorage.load('mailboxes')) || [];
            info(...COMPOSER_TAG, "Loading previously selected mailbox")
            let currentEmail = await SmallStorage.load('current-mailbox')
            if (!currentEmail) {
                if (mailboxes.length > 0) {
                    currentEmail = mailboxes[0]
                } else {
                    // we don't do anything.
                    // the mailbox modal will be shown automatically by mailapi.
                    return
                }
            }
            info(...COMPOSER_TAG, "Loading SMTP config...")
            await this.loadSMTPConfig(currentEmail)
            if (this.smtpConfig.provider == 'google') {
                info(...COMPOSER_TAG, "Loading Google config...")
                await this.google_loadConfig()
                await this.google_checkTokens()
            }
        },
        async saveSMTPConfig() {
            await SmallStorage.store(this.smtpConfig.email + '/smtp-config', this.smtpConfig)
        },
        async loadSMTPConfig(email) {
            this.smtpConfig = await SmallStorage.load(email + '/smtp-config')
        },
        task_OpenComposer(bang) {
            return this.ipcTask('please open the composer', {bang,})
        },
        async openComposer() {
            // TODO: somehow make settings
            const config = {
                smtp: this.smtpConfig,
            }

            // cache with randomized identifier
            const identifier = String.random(12)

            await BigStorage.store("composer/" + identifier, config)

            await this.callIPC(this.task_OpenComposer(identifier))
        },
        async loadComposer() {
            const identifier = this.bang
            if (!identifier) return window.error(...COMPOSER_TAG, "No bang!")
            const config = await BigStorage.pop("composer/" + identifier)
            if (!config) return window.error(...COMPOSER_TAG, "Config not found")
            this.smtpConfig = config.smtp
        },
    }
}