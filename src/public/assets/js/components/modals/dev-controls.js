Vue.component('dev-controls', {
  props: ['deleteCache'],
  data() {
    return {
      error: '',
      imapValid: null,
      smtpValid: null,
    }
  },
  methods: {
    async testIMAP () {
      this.imapValid = null
      const testConnection = await app.ipcTask('please test a connection', {
        ...app.imapConfig
      })
      const { valid, error } = await app.callIPC(testConnection).catch(_ => _)

      this.imapValid = !(error || !valid)
    },
    async testSMTP () {
      this.smtpValid = null
      const testConnection = await app.ipcTask('please test SMTP connection', {
        ...app.smtpConfig
      })
      const { valid, error } = await app.callIPC(testConnection).catch(_ => _)

      this.smtpValid = !(error || !valid)
    },
    async testConnection() {
      this.testIMAP()
      this.testSMTP()
    },
    async close() {
      app.showDev = false
    }
  }
})