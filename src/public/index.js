const { remote } = require('electron')
const {
    Mailbox,
    store,
    entry,
    platform,
    getWin
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