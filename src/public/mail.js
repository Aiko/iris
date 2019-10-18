const modals_mixin = {
    data: {

    },
    methods: {
        showAddMailbox() {
            $('.add-mailbox').modal('show')
        },
        hideAddMailbox() {
            $('.add-mailbox').modal('hide')
        },
        forceAddMailbox() {
            $('.add-mailbox').data('bs.modal', null)
            $('.add-mailbox').modal({
                backdrop: 'static',
                keyboard: false
            })
        }
    }
}



const app = new Vue({
    el: '#app',
    mixins: [mail_api_mixin, electron_mixin, modals_mixin, google_monkey_mixin],
    data: {
        loading: true,
        error: null,
        // Mail Server
        imapHost: '',
        imapPort: 993,
        smtpHost: '',
        smtpPort: 587,
        // State
        mailbox: {
            email: '',
            boards: [],
            events: []
        }
    },
    computed: {

    },
    watch: {
        loading(wasLoading, isLoading) {
            if (wasLoading && isLoading) return;
            if (!wasLoading && isLoading) {
                setTimeout(() => {
                    document.getElementById('fixed').style.display = 'none'
                }, 300)
                return
            }
            if (wasLoading && !isLoading) {
                document.getElementById('fixed').style.display = ''
                return
            }
            return
        },
    },
    async created() {
        // fetch existing credentials
        if (!store.get('authenticated', false)) entry()
        const {
            token, email, password
        } = store.get('authenticated', {
            token: null,
            email: null,
            password: null
        })

        if (!token) return entry()

        this.token = token

        // fetch profile, refresh token if needed, relogin if needed
        let profile = await this.fetchProfile()
        if (!profile) {
            log('Token invalid, need new token')
            const token = await this.login(email, password)
            if (!token) {
                log('Login credentials invalid, need new login')
                console.error("User is not truly authenticated. Prompting re-signin.")
                store.set('authenticated', null)
                entry()
                return
            }
            store.set('authenticated', {
                email: email,
                password: password,
                token: token
            })
            profile = await this.fetchProfile()
        } else {
            log('Token still valid and will be used as active token.')
        }

        // if no mailboxes, ask user to add one
        if (this.mailboxes.length == 0) {
            this.forceAddMailbox()
            return;
        }

        // TODO: otherwise...
        const current_mailbox = store.get('settings:current-mailbox', null)
        if (current_mailbox) {
            const mbox = this.mailboxes.filter(m => m.email == current_mailbox)
            if (mbox.length > 0) app.switchToMailbox(mbox[0])
            else {
                app.switchToMailbox(this.mailboxes[0])
            }
        } else {
            app.switchToMailbox(this.mailboxes[0])
        }
},
    methods: {
        async switchToMailbox(mailbox) {
            this.mailbox = mailbox
            const settings = store.get('credentials:' + this.mailbox.email, null)
            if (!settings) return console.error("We don't have settings for this mailbox!")
            store.set('settings:current-mailbox', this.mailbox.email)

            if (settings.gmail) {
                this.imapHost = 'imap.gmail.com'
                this.imapPort = 993
                this.smtpHost = 'smtp.gmail.com'
                this.smtpPort = 587
                return;
            }
            // TODO: branches for every type of inbox we support
        },
        async addGoogle() {
            const s = await this.gSignIn()
            if (s) {
                await this.hideAddMailbox()
                const r = await this.addMailbox(this.g_email)
                if (r) this.switchToMailbox(this.mailboxes.last())
            }
        }
    }
})

