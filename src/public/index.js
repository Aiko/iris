const {
    remote
} = require('electron')
const {
    Mailbox,
    store,
    entry,
    platform,
    getWin,
    GOAuth,
    MSOauth,
    queueCache
} = remote.require('./app.js')

const electron_mixin = {
    computed: {
        isFullScreen() {
            return getWin().isFullScreen()
        }
    },
    methods: {
        async minimize() {
            getWin().minimize()
        },
        async maximize() {
            getWin().maximize()
        },
        async fullscreen() {
            getWin().setFullScreen(true)
        },
        async close() {
            getWin().close()
        }
    }
}

const ai_mixin = {
    methods: {
        async summarize(text, n=3) {
            const s = await fetch('https://api.helloaiko.com/email', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "text": text,
                    "num": n
                })
            })
            const d = await s.json()
            if (d.text && d.text.length > 0) return d.text
            else return null
        },
        async choke(sentence) {
            sentence = unescapeHTML(sentence)
            sentence = sentence.trim()
            sentence = sentence.replace(/[^A-z0-9\.!\?,;\- '"]/g, '')
            if (sentence.length < 10) return 0;
            const s = await fetch('https://bigbrain.helloaiko.com:4114/parse', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    "q": sentence,
                    "project": "actionable",
                    "model": "v4"
                })
            }).catch(console.error)
            const d = await s.json()
            if (!d) return 0
            let conf = 0
            d.intent_ranking.map(({name, confidence}) => {
                if ([
                    "meeting",
                    "scheduling",
                    "actionable"
                ].includes(name))
                    conf += confidence
            })
            return conf
        }
    }
}

// only google oauth is monkey
const google_monkey_mixin = {
    data: {
        g_email: null,
        g_name: null,
        g_picture: null,
        g_access_token: null,
        g_expiry_date: null,
        g_id_token: null,
        g_refresh_token: null,
        g_scope: null,
        g_xoauth: null
    },
    methods: {
        async g_fetchTokens(email) {
            const creds = store.get('credentials:' + email)
            if (!creds.gmail) return console.error("Tried to fetch Google tokens with non-gmail.")
            this.g_email = creds.email
            this.g_name = creds.name
            this.g_picture = creds.picture
            this.g_access_token = creds.access_token
            this.g_expiry_date = creds.expiry_date
            this.g_id_token = creds.id_token
            this.g_refresh_token = creds.refresh_token
            this.g_scope = creds.scope
            this.g_xoauth = creds.xoauth
            await this.g_checkTokens()
        },
        async g_checkTokens() {
            // this should be called before using any xoauth token
            const today = new Date()
            const expiry = new Date(this.g_expiry_date)
            if (today > expiry || !this.g_access_token) {
                await this.g_updateTokens()
                return false
            }
            return true
        },
        async g_updateTokens() {
            const s = await GOAuth.refreshToken(this.g_refresh_token)
            const profile = await (await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + s.id_token)).json()
            const xoauth = btoa(
                "user=" + profile.email + "\u0001auth=Bearer " + s.access_token + "\u0001\u0001"
            )
            store.set('credentials:' + this.g_email, {
                email: this.g_email,
                name: profile.name,
                picture: profile.picture,
                access_token: s.access_token,
                expiry_date: this.g_expiry_date + (s.expires_in * 1000),
                id_token: s.id_token,
                refresh_token: this.g_refresh_token,
                scope: s.scope,
                xoauth: xoauth,
                gmail: true
            })

            await this.g_fetchTokens(this.g_email)
        },
        async gSignIn() {
            const s = await GOAuth.getToken()
            const profile = await (await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + s.id_token)).json()
            const xoauth = btoa(
                "user=" + profile.email + "\u0001auth=Bearer " + s.access_token + "\u0001\u0001"
            )
            // TODO: encrypt credentials
            store.set('credentials:' + profile.email, {
                email: profile.email,
                name: profile.name,
                picture: profile.picture,
                access_token: s.access_token,
                expiry_date: s.expiry_date,
                id_token: s.id_token,
                refresh_token: s.refresh_token,
                scope: s.scope,
                xoauth: xoauth,
                gmail: true
            })

            await this.g_fetchTokens(profile.email)
            return s
        },
        async g_refreshKeys() {
            if (!(await this.g_checkTokens())) {
                await this.connectToMailServer()
            }
        }
    }
}

const msft_oauth_mixin = {
    data: {
        msft_email: null,
        msft_name: null,
        msft_picture: null,
        msft_access_token: null,
        msft_expiry_date: null,
        msft_id_token: null,
        msft_refresh_token: null,
        msft_scope: null,
        msft_xoauth: null
    },
    methods: {
        async msft_fetchTokens(email) {
            const creds = store.get('credentials:' + email)
            if (!creds.msft) return console.error("Tried to fetch MSFT tokens with non-msft.")
            this.msft_email = creds.email
            this.msft_name = creds.name
            this.msft_picture = creds.picture
            this.msft_access_token = creds.access_token
            this.msft_expiry_date = creds.expiry_date
            this.msft_id_token = creds.id_token
            this.msft_refresh_token = creds.refresh_token
            this.msft_scope = creds.scope
            this.msft_xoauth = creds.xoauth
            await this.msft_checkTokens()
        },
        async msft_checkTokens() {
            // this should be called before using any xoauth token
            const today = new Date()
            const expiry = new Date(this.msft_expiry_date)
            if (today > expiry || !this.msft_access_token) {
                await this.msft_updateTokens()
                return false
            }
            return true
        },
        async msft_updateTokens() {
            const s = await MSOauth.refreshToken(this.msft_refresh_token)
            const profile = await (await fetch('https://graph.microsoft.com/v1.0/me', {
                method: 'GET',
                headers: {
                    "Authorization": "Bearer " + s.access_token
                }
            })).json()
            const xoauth = btoa(
                "user=" + (profile.mail || profile.userPrincipalName) + "\u0001auth=Bearer " + s.access_token + "\u0001\u0001"
            )
            store.set('credentials:' + this.msft_email, {
                email: this.msft_email,
                name: profile.givenName,
                picture: null,
                access_token: s.access_token,
                expiry_date: this.msft_expiry_date + (s.expires_in * 1000),
                id_token: s.id_token,
                refresh_token: this.msft_refresh_token,
                scope: s.scope,
                xoauth: xoauth,
                msft: true
            })

            await this.msft_fetchTokens(this.msft_email)
        },
        async msftSignIn() {
            app.fetching = true
            const s = await MSOauth.getToken()
            console.log(s)
            const profile = await (await fetch('https://graph.microsoft.com/v1.0/me', {
                method: 'GET',
                headers: {
                    "Authorization": "Bearer " + s.access_token
                }
            })).json()
            console.log(profile)
            const xoauth = btoa(
                "user=" + (profile.mail || profile.userPrincipalName) + "\u0001auth=Bearer " + s.access_token + "\u0001\u0001"
            )
            // TODO: encrypt credentials
            store.set('credentials:' + (profile.mail || profile.userPrincipalName), {
                email: profile.mail || profile.userPrincipalName,
                name: profile.givenName,
                picture: null,
                access_token: s.access_token,
                expiry_date: s.expiry_date,
                id_token: s.id_token,
                refresh_token: s.refresh_token,
                scope: s.scope,
                xoauth: xoauth,
                msft: true
            })

            app.fetching = false
            await this.msft_fetchTokens(profile.mail || profile.userPrincipalName)
            return s
        },
        async msft_refreshKeys() {
            if (!(await this.msft_checkTokens())) {
                await this.connectToMailServer()
            }
        }
    }
}

const manual_mailbox_mixin = {
    data: {
        other_email: null,
        other_name: null,
        other_picture: null,
        other_password: null,
        other_imap_host: null,
        other_imap_port: null,
        other_smtp_host: null,
        other_smtp_port: null
    },
    methods: {
        async other_fetchCredentials(email) {
            const creds = store.get('credentials:' + email)
            if (!creds.other) return console.error("Tried to fetch OTHER creds with non-other.")
            this.other_email = creds.email
            this.other_name = creds.name
            this.other_picture = creds.picture
            this.other_password = creds.password
            this.other_imap_host = creds.imap_host
            this.other_imap_port = creds.imap_port
            this.other_smtp_host = creds.smtp_host
            this.other_smtp_port = creds.smtp_port
        },
        async otherSignIn(email, password, imapHost, imapPort, smtpHost, smtpPort) {
            app.fetching = true
            store.set('credentials:' + email, {
                name: email, // TODO:
                picture: null, // TODO:
                email: email,
                password: password,
                imap_host: imapHost,
                imap_port: imapPort,
                smtp_host: smtpHost,
                smtp_port: smtpPort,
                other: true
            })
            app.fetching = false
            await this.other_fetchCredentials(email)
        }
    }
}