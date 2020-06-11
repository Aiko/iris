Vue.component('add-board-modal', {
    data() {
        return {
            name: '',
            step: 1
        }
    },
    computed: {
        validBoard() {
            return !!(this.name)
        }
    },
    methods: {
        async addBoard() {
            // TODO: check to make sure name is valid
            info(...MODALS_TAG, "Making a new board with title:", this.name)
            const path = app.folderWithSlug(this.name)
            const s = await app.callIPC(app.task_NewFolder(path))
            if (!s || s.error)
                return window.error(...MODALS_TAG, "Couldn't make board:", s?.error)
            info(...MODALS_TAG, "Made a new board with path:", path)
            app.boardNames.push(path)
            Vue.set(app.boards, path, {
                uidLatest: -1,
                emails: [],
                //modSeq: -1,
            })
            info(...MODALS_TAG, "Updated the app's view model.")
            await BigStorage.store(app.imapConfig.email + '/boards', app.boards)
            await SmallStorage.store(app.imapConfig.email + ':board-names', app.boardNames)
            info(...MODALS_TAG, "Saved the boards cache for the app.")
            this.close()
        },
        async close() {
            app.addBoard = false
        }
    }
})