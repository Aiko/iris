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
  created() {
    ipcRenderer.invoke(this.windowPrefix + ": please get the platform").then(this.updatePlatform)
  },
  methods: {
    async updatePlatform(platform) {
      this.isPC = platform == 'win32'
      this.isMac = platform == 'darwin'
      this.isLinux = (platform != 'win32' && platform != 'darwin')
    },
    async initWindowControls () {
      ipcRenderer.on(this.windowPrefix + ': please fullscreen status changed',
        (_, status) => app.isFullScreen = status)
      ipcRenderer.on(this.windowPrefix + ': please maximized status changed',
        (_, status) => app.isMaximized = status)
      ipcRenderer.invoke(this.windowPrefix + ': please get fullscreen status')

      ipcRenderer.on(this.windowPrefix + ': please update color scheme',
        () => this.updateColorScheme())
    },
    async updateColorScheme () {
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
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
    },
    async find () {
      await ipcRenderer.invoke(this.windowPrefix + ': please find in window')
    },
    async focus () {
      await ipcRenderer.invoke(this.windowPrefix + ': please focus window')
    }
  }
}
