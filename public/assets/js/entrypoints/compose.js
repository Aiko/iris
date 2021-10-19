const AikoEditor = Grimaldi.default

const app = new Vue({
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
    calendar, // Calendar API
    VueClickaway.mixin, // Clickaway
  ],
  components: {
    AikoEditor
  },
  data: {
    TAG: ['%c[COMPOSER MAIN]', 'background-color: #dd00aa; color: #000;'],
    loading: true,
    bang: '',
    editor: null,
    html: '',
    linkUrl: null,
    linkMenuIsActive: false,
    showBCC: false,
    contacts: {},
  },
  watch: {
    loading(isLoading, wasLoading) {
      if (wasLoading && isLoading) return
      if (wasLoading && !isLoading) {
        setTimeout(() => {
          document.getElementById('fixed').style.display = 'none'
        }, 300)
        return
      }
      if (!wasLoading && isLoading) {
        document.getElementById('fixed').style.display = ''
      }
    },
    showBCC() {
      this.calculateComposerHeight()
    },
  },
  async created() {
    document.getElementById('app').style.opacity = 1
    console.time('APP STARTUP')
    info(...(this.TAG), 'Initializing application')
    this.loading = true

    this.bang = 'composer-' + window.location.hash.substr(1)

    info(...(this.TAG), 'Initializing cache')
    await Satellite.load('random')

    // setup IPC
    info(...(this.TAG), 'Initializing IPC')
    await this.initIPCNoStream()

    // setup window controls
    info(...(this.TAG), 'Initializing window controls')
    this.windowPrefix = this.bang
    this.isMaximized = false
    await this.initWindowControls()

    // fetch preferences
    await DwarfStar.sync()
    const settings = DwarfStar.settings()
    const token = settings.auth.token

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
    await this.getEngine()
    info(...(this.TAG), 'Bound to temporary engine.')

    // setup SMTP listeners
    info(...(this.TAG), 'Initializing SMTP')
    await this.initSMTP()
    await this.loadComposer()

    this.calculateComposerHeight()
    success(...(this.TAG), 'Finished initialization.')
    this.loading = false
    console.timeEnd('APP STARTUP')
  },
  methods: {
    log(...msg) {
      console.log(...msg)
    },
    async calculateComposerHeight() {
      await this.$root.$nextTick()
      const composer = this.$refs['editor'].$el
      const offset = composer.offsetTop + 66
      composer.style.maxHeight = `calc(100% - ${offset}px)`
    }
  }
})