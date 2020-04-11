const { platform } = remote.require('./app.js')

const windowManager = {
    data: {
        isFullScreen: false,
        isMaximized: true,
        isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
        isPC: platform == 'win32',
        isMac: platform == 'darwin',
        isLinux: (platform != 'win32' && platform != 'darwin'),
    },
    methods: {
        async initWindowControls() {
            ipcRenderer.on('fullscreen status changed',
                (_, status) => app.isFullScreen = status);
            ipcRenderer.on('maximized status changed',
                (_, status) => app.isMaximized = status);
        },
        // why use IPC here?
        // because we dont want everything to freeze
        // and we want to be able to do some magic with these later on
        async minimize() {
            await ipcRenderer.invoke('please minimize window')
        },
        async maximize() {
            await ipcRenderer.invoke('please maximize window')
        },
        async unmaximize() {
            await ipcRenderer.invoke('please unmaximize window')
        },
        async fullscreen() {
            await ipcRenderer.invoke('please fullscreen window')
        },
        async close() {
            await ipcRenderer.invoke('please close window')
        }
    }
}