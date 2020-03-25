const aikoapi = {
    data: {
        TAG: ["%c[AIKO API]", "color: #4b74ff"],

        profile: {
            name: '',
            confirmed: false,
            pictureURI: '',
            email: '',
            period_ends: null, // this needs to manually be turned into a date object
            mailboxes: [{
                boards: [{
                    name: ''
                }],
                email: '',
                events: []
            }],
            team: [{
                member: {
                    name: '',
                    confirmed: false,
                    pictureURI: '',
                    email: '',
                    created: null // this needs to manually be turned into a date object
                },
                role: ''
            }, ]
        },
        token: '',
    },
    methods: {
        // USER API
        async fetchProfile() {
            info(...TAG, "Attempting to fetch user profile.")
            if (!this.token) return error(...TAG, "Tried to fetch user profile but no token has been retrieved.")
            try {
                const d = await post('/v3/me', {}, this.token)
                if (!d || d.error) {
                    error(...TAG, d.error)
                    return d.error
                }

                this.profile = d

                // manually form Date objects for later use
                this.profile.period_ends = new Date(this.profile.period_ends)
                this.profile.team = this.profile.team.map(tm => {
                    tm.member.created = new Date(tm.member.created)
                    return tm
                })

                success(...TAG, "Fetched user profile.")
                return true
            } catch (e) {
                error(...TAG, e)
                if (e.message == 'Failed to fetch') {
                    app.isOnline = false
                    error(...TAG, "App is not online!")
                }
                return e
            }
        },
        async signup(email) {
            info(...TAG, "Attempting to sign up with email:", email)
            try {
                this.profile.email = email
                const d = await post('/v3/signup', {
                    email: this.profile.email
                })
                if (!d || d.error || !d.accessToken) {
                    error(...TAG, d.error)
                    return d.error
                }
                this.token = d.accessToken
                success(...TAG, "Successfully signed up with email:", email)
                return this.token
                // NOTE: this doesn't call fetch profile as the user should confirm email first
            } catch (e) {
                error(...TAG, e)
                if (e.message == 'Failed to fetch') {
                    app.isOnline = false
                    error(...TAG, "App is not online!")
                }
                return null
            }
        },
        async login(email, password) {
            info(...TAG, "Attempting to log in to account with email:", email)
            try {
                this.profile.email = email
                const d = await post('/v3/login', {
                    email: this.profile.email,
                    password: password
                })
                if (!d || d.error || !d.accessToken) {
                    error(...TAG, d.error)
                    return d.error
                }
                this.token = d.accessToken
                success(...TAG, "Logged into account with email:", email)
                await this.fetchProfile()
                return this.token
            } catch (e) {
                error(...TAG, e)
                if (e.message == 'Failed to fetch') {
                    app.isOnline = false
                    error(...TAG, "App is not online!")
                }
                return null
            }
        },
        async register(email, password) {
            // FIXME: before using this, please make sure the registration token from the page is loaded into the vue app
            // this can be done in a script snippet:
            // <script>app.token = window.location.hash</script>
            info(...TAG, "Attempting to register account with email:", email)
            if (!this.token) return error(...TAG, "Tried to register account but no token has been retrieved.")
            let companyName, companyColor, companyLogo = null;
            if (this.profile.team) {
                companyName = this.profile.team.name;
                companyColor = this.profile.team.accentColor;
                companyLogo = this.profile.team.pictureURI;
            }
            try {
                this.profile.email = email
                const d = await post('/v3/account/register', {
                    name: this.profile.name,
                    email, password,
                    companyName, companyLogo, companyColor
                })
                if (!d || d.error || !d.accessToken) {
                    error(...TAG, d.error)
                    return d.error
                }
                this.token = d.accessToken
                success(...TAG, "Registered account with email:", email)
                await this.fetchProfile()
                return this.token
            } catch (e) {
                error(...TAG, e)
                if (e.message == 'Failed to fetch') {
                    app.isOnline = false
                    error(...TAG, "App is not online!")
                }
                return null
            }
        },
        async updateProfile() {
            info(...TAG, "Attempting to update user profile.")
            if (!this.token) return error(...TAG, "Tried to update user profile but no token has been retrieved.")
            try {
                const d = await post('/v3/account/update', {
                    name: this.profile.name,
                    email: this.profile.email
                }, this.token)
                if (!d || d.error) {
                    error(...TAG, d.error)
                    return d.error
                }

                success(...TAG, "Updated user profile.")
                await this.fetchProfile()
                return true
            } catch (e) {
                error(...TAG, e)
                if (e.message == 'Failed to fetch') {
                    app.isOnline = false
                    error(...TAG, "App is not online!")
                }
                return e
            }
        },
        async changePassword(oldPassword, newPassword) {
            info(...TAG, "Attempting to change password.")
            if (!this.token) return error(...TAG, "Tried to change password but no token has been retrieved.")
            try {
                const d = await post('/v3/account/update', {
                    name: this.profile.name,
                    email: this.profile.email,
                    password: oldPassword,
                    newPassword
                }, this.token)
                if (!d || d.error) {
                    error(...TAG, d.error)
                    return d.error
                }

                success(...TAG, "Changed password.")
                await this.fetchProfile()
                return true
            } catch (e) {
                error(...TAG, e)
                if (e.message == 'Failed to fetch') {
                    app.isOnline = false
                    error(...TAG, "App is not online!")
                }
                return e
            }
        },
        async deleteAccount(email, password) {
            // FIXME: this is not currently exposed on our server
            info(...TAG, "Attempting to delete account.")
            if (!this.token) return error(...TAG, "Tried to delete account but no token has been retrieved.")
            try {
                const d = await post('/v3/account/delete', {
                    email: email,
                    password: password,
                }, this.token)
                if (!d || d.error) {
                    error(...TAG, d.error)
                    return d.error
                }
                success(...TAG, "Deleted account.")
                this.profile = {
                    name: '',
                    confirmed: false,
                    pictureURI: '',
                    email: '',
                    period_ends: null, // this needs to manually be turned into a date object
                    mailboxes: [{
                        boards: [{
                            name: ''
                        }],
                        email: '',
                        events: []
                    }],
                    team: [{
                        member: {
                            name: '',
                            confirmed: false,
                            pictureURI: '',
                            email: '',
                            created: null // this needs to manually be turned into a date object
                        },
                        role: ''
                    }, ]
                }
                this.token = ''
                return true
            } catch (e) {
                error(...TAG, e)
                if (e.message == 'Failed to fetch') {
                    app.isOnline = false
                    error(...TAG, "App is not online!")
                }
                return e
            }
        },
        /*
            We don't expose the forgot password and
            reset password endpoints through this
            mixin. Those are considered extra secure
            and so should not be interfaced outside
            of Aiko's actual website at any point.
        */
        // TEAM API
        async teamInvite(emails) {
            info(...TAG, "Attempting to invite new users with emails:", emails)
            if (!this.token) return error(...TAG, "Tried to invite to team but no token has been retrieved.")
            try {
                const d = await post('/v3/team/invite', {
                    emails: emails
                }, this.token)
                if (!d || d.error) {
                    error(...TAG, d.error)
                    return d.error
                }

                success(...TAG, "Added mailbox with email:", email)
                return await this.fetchProfile()
            } catch (e) {
                error(...TAG, e)
                if (e.message == 'Failed to fetch') {
                    app.isOnline = false
                    error(...TAG, "App is not online!")
                }
                return false
            }
        },
        async addMailbox(email) {
            info(...TAG, "Attempting to add a new mailbox with email:", email)
            if (!this.token) return error(...TAG, "Tried to add mailbox but no token has been retrieved.")
            try {
                const d = await post('/v3/mailboxes/create', {
                    email: email
                }, this.token)
                if (!d || d.error) {
                    error(...TAG, d.error)
                    return d.error
                }

                success(...TAG, "Added mailbox with email:", email)
                return await this.fetchProfile()
            } catch (e) {
                error(...TAG, e)
                if (e.message == 'Failed to fetch') {
                    app.isOnline = false
                    error(...TAG, "App is not online!")
                }
                return false
            }
        },
        async makeTracker(mid, to, subject) {
            try {
                const d = await post('/v3/pixies/create', {
                    mid: mid,
                    to: to,
                    subject: subject,
                    mailboxId: this.mailbox._id
                }, this.token)
                if (!d || d.error || !d.success) return false

                return d.pix
            } catch (e) {
                console.error(e)
                return false
            }
        },
        async updateBoards() {
            try {
                const d = await post('/v3/mailboxes/boards', {
                    mailboxId: this.mailbox._id,
                    boards: this.mailbox.boards.map(board => {
                        return {
                            "_id": board._id,
                            "name": board.name
                        }
                    })
                }, this.token)
                if (!d || d.error) return false

                await this.fetchProfile()
                this.fetching = true
                await this.switchToMailbox(this.mailboxes.filter(mailbox => mailbox.email == this.mailbox.email)[0])

            } catch (e) {
                console.error(e)
                return false
            }
        },
    }
}