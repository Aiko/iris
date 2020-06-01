const app = new Vue({
    el: "#app",
    mixins: [
        ipc, // IPC communication
        aikoapi, // Aiko API
        windowManager, // window controls
        composer, // SMTP API
        goauth, // Google OAuth
    ],
    data: {
        TAG: ["%c[COMPOSER MAIN]", "background-color: #dd00aa; color: #000;"],
        loading: true,
        bang: '',
    },
    watch: {
        loading(isLoading, wasLoading) {
            if (wasLoading && isLoading) return;
            if (wasLoading && !isLoading) {
                setTimeout(() => {
                    document.getElementById('fixed').style.display = 'none'
                }, 300)
                return
            }
            if (!wasLoading && isLoading) {
                document.getElementById('fixed').style.display = ''
                return
            }
            return
        },
    },
    async created() {
        document.getElementById('app').style.opacity = 1
        console.time("APP STARTUP")
        info(...(this.TAG), "Initializing application")
        this.loading = true

        this.bang = window.location.hash.substr(1)

        info(...(this.TAG), "Initializing cache")
        await SmallStorage.load('random')

        // setup IPC
        info(...(this.TAG), "Initializing IPC")
        await this.initIPCNoStream()

        // setup window controls
        info(...(this.TAG), "Initializing window controls")
        this.windowPrefix = this.bang + ':please'
        this.isMaximized = false
        await this.initWindowControls()

        // fetch preferences
        info(...(this.TAG), "Fetching preferences")
        const {
            token,
        } = await ipcRenderer.invoke('get preferences', [
            'token',
        ])

        // try logging in
        info(...(this.TAG), "Logging in")
        const {
            error
        } = await this.initAPI(token)
        if (error) {
            window.error(...(this.TAG), "Authentication failed. User needs to login again?")
            // FIXME: we can try relog with stored email/pass
            // if those fail then we can ask for relog
            await ipcRenderer.invoke('save preferences', {
                authenticated: false
            })
            await ipcRenderer.invoke('reentry')
            return
        }

        // setup SMTP listeners
        info(...(this.TAG), "Initializing SMTP")
        await this.initSMTP()
        await this.loadComposer()

        success(...(this.TAG), "Finished initialization.")
        this.loading = false
        console.timeEnd("APP STARTUP")
    },
    methods: {
        log(...msg) {
            console.log(...msg)
        },
    }
})