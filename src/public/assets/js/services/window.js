const { platform } = remote.require('./app.js')

const windowManager = {
    data: {
        windowPrefix: 'please',
        isFullScreen: false,
        isMaximized: true,
        isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
        isPC: platform == 'win32',
        isMac: platform == 'darwin',
        isLinux: (platform != 'win32' && platform != 'darwin'),
    },
    methods: {
        async initWindowControls() {
            ipcRenderer.on(this.windowPrefix + ' fullscreen status changed',
                (_, status) => app.isFullScreen = status);
            ipcRenderer.on(this.windowPrefix + ' maximized status changed',
                (_, status) => app.isMaximized = status);

            ipcRenderer.invoke(this.windowPrefix + ' get fullscreen status')
        },
        // why use IPC here?
        // because we dont want everything to freeze
        // and we want to be able to do some magic with these later on
        async minimize() {
            await ipcRenderer.invoke(this.windowPrefix + ' minimize window')
        },
        async maximize() {
            await ipcRenderer.invoke(this.windowPrefix + ' maximize window')
        },
        async unmaximize() {
            await ipcRenderer.invoke(this.windowPrefix + ' unmaximize window')
        },
        async fullscreen() {
            await ipcRenderer.invoke(this.windowPrefix + ' fullscreen window')
        },
        async close() {
            try {
                await ipcRenderer.invoke(this.windowPrefix + ' close window')
            } catch (e) {
                window.close()
            }
        }
    }
}