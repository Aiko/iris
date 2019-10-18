const {
    remote
} = require('electron')
const {
    Mailbox,
    store,
    entry,
    platform,
    getWin,
    GOAuth
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
        async fetchTokens(email) {
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
            await this.checkTokens()
        },
        async checkTokens() {
            // this should be called before using any xoauth token
            const today = new Date()
            const expiry = new Date(this.g_expiry_date)
            if (today > expiry) await this.updateTokens()
        },
        async updateTokens() {
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

            await this.fetchTokens(this.g_email)
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

            await this.fetchTokens(profile.email)
            return s
        }
    }
}