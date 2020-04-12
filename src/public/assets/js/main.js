const app = new Vue({
    el: "#app",
    mixins: [
        ipc, // IPC communication
        aikoapi, // Aiko API
        windowManager, // window controls
        mailapi, // IMAP API
    ],
    data: {
        TAG: ["%c[MAIN]", "background-color: #dd00aa; color: #000;"],
        loading: false,
        firstTime: true,
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
        info(...(this.TAG), "Initializing application")
        this.loading = true

        // setup IPC
        info(...(this.TAG), "Initializing IPC")
        await this.initIPC()

        // setup window controls
        info(...(this.TAG), "Initializing window controls")
        await this.initWindowControls()

        // setup IMAP listeners
        info(...(this.TAG), "Initializing IMAP")
        await this.initIMAP()

        // fetch preferences
        info(...(this.TAG), "Fetching preferences")
        const {
            token,
            firstTime
        } = await ipcRenderer.invoke('get preferences', [
            'token',
            'firstTime'
        ])
        this.firstTime = firstTime
        if (this.firstTime) {
            info(...(this.TAG), "This is the user's first open of the app.")
            await ipcRenderer.invoke('save preferences', {firstTime: false})
        }

        // try logging in
        info(...(this.TAG), "Logging in")
        const { error } = await this.initAPI(token)
        if (error) {
            error(...(this.TAG), "Authentication failed. User needs to login again?")
            // FIXME: we can try relog with stored email/pass
            // if those fail then we can ask for relog
            await ipcRenderer.invoke('save preferences', {
                authenticated: false
            })
            await ipcRenderer.invoke('reentry')
            return
        }

        success(...(this.TAG), "Finished initialization.")
        this.loading = false
    },
    methods: {

    }
})