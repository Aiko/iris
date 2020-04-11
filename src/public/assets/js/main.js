const app = new Vue({
    el: "#app",
    mixins: [
        ipc, // IPC communication
        aikoapi, // Aiko API
    ],
    data: {
        TAG: ["%c[MAIN]", "background-color: #dd00aa; color: #000;"],
        loading: false
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
        // try logging in
        const { token } = await ipcRenderer.invoke('get preferences', ['token'])
        const { error } = await this.initAPI(token)
        if (error) {
            await ipcRenderer.invoke('save preferences', {
                authenticated: false
            })
            await ipcRenderer.invoke('reentry')
            return
        }
    },
    methods: {

    }
})