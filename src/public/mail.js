const app = new Vue({
    el: '#app',
    mixins: [mail_api_mixin, electron_mixin],
    data: {
        loading: true,
        error: null,
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
        const {
            token, email, password
        } = store.get('authenticated', {})

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

        }
    },
    methods: {
    }
})

