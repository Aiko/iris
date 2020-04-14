const GOAUTH_TAG = ["%c[GOOGLE]", "background-color: #ffaa00; color: #000;"]

const goauth = {
    data: {
        googleConfig: {
            access_token: '',
            id_token: '',
            expiry_date: '',
            refresh_token: '',
            scope: ''
        },
    },
    methods: {
        async google_saveConfig() {
            await SmallStorage.store(this.imapConfig.email + '/google-config', this.googleConfig)
        },
        async google_loadConfig() {
            // must have called loadIMAPConfig first
            this.googleConfig = await SmallStorage.load(this.imapConfig.email + '/google-config')
        },
        // Core Methods
        async google_addMailbox() {
            info(...(GOAUTH_TAG), "Adding new mailbox.")
            const {
                access_token,
                id_token,
                expiry_date,
                refresh_token,
                scope
            } = await this.callIPC(this.ipcTask('please get google oauth token', {}))

            if (!access_token) return false

            info(...(GOAUTH_TAG), "Fetching profile.")
            const profile = await (
                await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + id_token)
            ).json()

            const xoauth = access_token
            /*const xoauth = btoa(
                "user=" + profile.email + "\u0001auth=Bearer " + access_token + "\u0001\u0001"
            )*/

            success(...(GOAUTH_TAG), "Setting up IMAP configuration.")
            this.imapConfig.email = profile.email
            this.imapConfig.host = 'imap.gmail.com'
            this.imapConfig.port = 993
            this.imapConfig.xoauth2 = xoauth
            this.imapConfig.user = profile.email
            this.imapConfig.pass = ''
            this.imapConfig.provider = 'google'
            this.imapConfig.secure = true
            await this.saveIMAPConfig()

            success(...(GOAUTH_TAG), "Setting up Google configuration.")
            this.googleConfig.access_token = access_token
            this.googleConfig.id_token = id_token
            this.googleConfig.expiry_date = expiry_date
            this.googleConfig.refresh_token = refresh_token
            this.googleConfig.scope = scope
            await this.google_saveConfig()

            return true
        },
        async google_checkTokens() {
            info(...(GOAUTH_TAG), "Checking tokens for expiration.")
            const today = new Date()
            const expiry = new Date(this.googleConfig.expiry_date)
            if (today > expiry || !this.googleConfig.access_token) {
                log(...(GOAUTH_TAG), "Tokens have expired, updating them automatically.")

                info(...(GOAUTH_TAG), "Refreshing tokens.")
                const {
                    access_token,
                    id_token,
                    expires_in,
                    scope
                } = await this.callIPC(this.ipcTask('please refresh google oauth token', {
                    r_token: this.googleConfig.refreshToken
                }))

                info(...(GOAUTH_TAG), "Fetching profile.")
                const profile = await (
                    await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + id_token)
                ).json()

                const xoauth = access_token
                /*const xoauth = btoa(
                    "user=" + profile.email + "\u0001auth=Bearer " + access_token + "\u0001\u0001"
                )*/

                success(...(GOAUTH_TAG), "Setting up IMAP configuration.")
                this.imapConfig.email = profile.email
                this.imapConfig.host = 'imap.gmail.com'
                this.imapConfig.port = 993
                this.imapConfig.xoauth2 = xoauth
                this.imapConfig.user = profile.email
                this.imapConfig.pass = ''
                this.imapConfig.secure = true // gmail uses self signed certs
                this.imapConfig.provider = 'google'
                await this.saveIMAPConfig()

                success(...(GOAUTH_TAG), "Setting up Google configuration.")
                this.googleConfig.access_token = access_token
                this.googleConfig.id_token = id_token
                this.googleConfig.expiry_date = this.googleConfig.expiry_date + (expires_in * 1000)
                this.googleConfig.scope = scope
                await this.google_saveConfig()

                await this.reconnectToMailServer
            }
        },
    }
}