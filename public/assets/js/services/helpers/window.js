const { platform } = remote.require('./app.js')

const window_mgr = {
  data: {
    windowPrefix: 'INBOX',
    isFullScreen: false,
    isMaximized: true,
    isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    isPC: platform == 'win32',
    isMac: platform == 'darwin',
    isLinux: (platform != 'win32' && platform != 'darwin')
  },
  methods: {
    async initWindowControls () {
      ipcRenderer.on(this.windowPrefix + ': please fullscreen status changed',
        (_, status) => app.isFullScreen = status)
      ipcRenderer.on(this.windowPrefix + ': please maximized status changed',
        (_, status) => app.isMaximized = status)

      ipcRenderer.invoke(this.windowPrefix + ': please get fullscreen status')
    },
    // why use IPC here?
    // because we dont want everything to freeze
    // and we want to be able to do some magic with these later on
    async minimize () {
      await ipcRenderer.invoke(this.windowPrefix + ': please minimize window')
    },
    async maximize () {
      await ipcRenderer.invoke(this.windowPrefix + ': please maximize window')
    },
    async unmaximize () {
      await ipcRenderer.invoke(this.windowPrefix + ': please unmaximize window')
    },
    async fullscreen () {
      await ipcRenderer.invoke(this.windowPrefix + ': please fullscreen window')
    },
    async hide () {
      await ipcRenderer.invoke(this.windowPrefix + ': please hide window')
    },
    async close () {
      try {
        await ipcRenderer.invoke(this.windowPrefix + ': please close window')
      } catch (e) {
        window.close()
      }
    }
  }
}
