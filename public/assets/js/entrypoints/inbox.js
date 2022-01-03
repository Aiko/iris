top.app = new Vue({
  el: '#app',
  mixins: [
    ipc, // IPC communication
    aikoapi, // Aiko API
    window_mgr, // window controls
    mailapi, // IMAP API
    composer, // SMTP API
    goauth, // Google OAuth
    msoauth, // Microsoft OAuth
    oauth, // OAuth Provider
    flow_mgr, // Modals
    shortcuts, // Shortcuts
    calendar, // Calendar API
    settings, // Settings API
    icon_mgr, // Icon Manager
  ],
  data: {
    TAG: ['%c[MAIN]', 'background-color: #dd00aa; color: #000;'],
    loading: true,
    firstTime: true,
    priority: true,
    collapseSidebar: false,
    zenMode: false,
    hash: '',
    tour: null
  },
  watch: {
    loading (isLoading, wasLoading) {
      if (wasLoading && isLoading) return
      if (wasLoading && !isLoading) {
        setTimeout(() => {
          document.getElementById('fixed').style.visibility = 'hidden'
        }, 300)
        return
      }
      if (!wasLoading && isLoading) {
        document.getElementById('fixed').style.visibility = 'unset'
      }
    }
  },
  async created () {
    document.getElementById('app').style.opacity = 1
    console.time('APP STARTUP')
    info(...(this.TAG), 'Initializing application')
    this.loading = true
    this.hash = window.location.hash

    info(...(this.TAG), 'Initializing cache')
    await Satellite.load('random')

    // setup IPC
    info(...(this.TAG), 'Initializing IPC')
    await this.initIPC()

    // setup window controls
    info(...(this.TAG), 'Initializing window controls')
    await this.initWindowControls()

    // fetch preferences
    await DwarfStar.sync()
    const settings = DwarfStar.settings()
    const token = settings.auth.token
    const firstTime = settings.meta.firstTime
    this.firstTime = firstTime

    // try logging in
    info(...(this.TAG), 'Logging in')
    const {
      error
    } = await this.initAPI(token)
    if (error) {
      window.error(...(this.TAG), 'Authentication failed. User needs to login again?')
      // FIXME: we can try relog with stored email/pass
      // if those fail then we can ask for relog
      await DwarfStar.save({auth: {authenticated: false}})
      await ipcRenderer.invoke('reentry')
      return
    }

    // setup IMAP listeners
    info(...(this.TAG), 'Initializing IMAP')
    await this.initIMAP()

    info(...(this.TAG), 'Initializing SMTP')
    await this.initSMTP()

    success(...(this.TAG), 'Finished initialization.')
    console.timeEnd('APP STARTUP')
    this.loading = false // let mail.js decide when to kill loader
    this.switchMailServer() // load mailserver
  },
  methods: {
    log (...msg) {
      console.log(...msg)
    },
    async deleteCache({composer=false, prefs=false, chrome=false, session=false, mouseion=false}) {
      if (composer) await GasGiant.kill()
      if (prefs) await DwarfStar.reset()
      if (chrome) await Satellite.kill()
      if (session) await this.callIPC(this.ipcTask("clear all cache", {}))
      if (mouseion) await this.callIPC(this.ipcTask("please burn the mouseion", {}))
      //? prevent cache bad state
      if (!prefs && !(mouseion && !chrome)) window.location.reload()
      else await ipcRenderer.invoke('reentry')
    }
  }
})

app = top.app

window.onresize = top.app.recalculateHeight