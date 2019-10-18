const mail_api_mixin = {
    data: {
        email: '',
        token: '',
        name: '',
        confirmed: false,
        pictureURI: '',
        period_ends: null,
        mailboxes: [],
        team: []
    },
    methods: {
        async login(email, password) {
            try {
                this.email = email
                const d = await post('/v3/login', {
                    email: this.email,
                    password: password
                })
                if (!d || d.error || !d.accessToken) {
                    return null
                }
                this.token = d.accessToken
                return this.token
            } catch (e) {
                console.error(e)
                return null
            }
        },
        async fetchProfile() {
            try {
                const d = await post('/v3/me', {}, this.token)
                if (!d || d.error) return false

                this.name = d.name
                this.email = d.email
                this.confirmed = d.confirmed
                this.pictureURI = d.pictureURI
                this.period_ends = d.period_ends
                this.mailboxes = d.mailboxes
                this.team = d.team
                return true
            } catch (e) {
                console.error(e)
                return false
            }
        },
        async addMailbox(email) {
            try {
                const d = await post('/v3/mailboxes/create', {
                    email: email
                }, this.token)
                if (!d || d.error) return false

                await this.fetchProfile()
            } catch (e) {
                console.error(e)
                return false
            }
        },
    }
}