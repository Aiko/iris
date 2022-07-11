Vue.component('dev-controls', {
  props: ['deleteCache'],
  data() {
    return {
      error: '',
      imapValid: null,
      smtpValid: null,
    }
  },
  computed: {
    efficiency: function() {
      const emails = (new Set([...(this.$root.priorityInbox), ...(this.$root.boards.filter(({ name }) => name != "Done").flatMap(board => board.tids))])).size
      const eff = 1 - (emails / this.$root.fullInbox.length)
      return (eff * 100).toFixed(2)
    },
    time: function() {
      const emails = (new Set([...(this.$root.priorityInbox), ...(this.$root.boards.filter(({ name }) => name != "Done").flatMap(board => board.tids))])).size
      const reduction = this.$root.fullInbox.length - emails
      return (reduction * 1.1 * 60).secondsToTimestring();
    }
  },
  methods: {
    async testIMAP () {
      this.imapValid = null
      const testConnection = await this.$root.ipcTask('please test a connection', {
        ...app.imapConfig
      })
      const { valid, error } = await this.$root.callIPC(testConnection).catch(_ => _)

      this.imapValid = !(error || !valid)
    },
    async testSMTP () {
      this.smtpValid = null
      const testConnection = await this.$root.ipcTask('please test SMTP connection', {
        ...app.smtpConfig
      })
      const { valid, error } = await this.$root.callIPC(testConnection).catch(_ => _)

      this.smtpValid = !(error || !valid)
    },
    async testConnection() {
      this.testIMAP()
      this.testSMTP()
    },
    async openMouseion() {
      await this.$root.callIPC(this.$root.ipcTask('please open mouseion', {}))
    },
    async getLogs() {
      await this.$root.callIPC(this.$root.ipcTask('please get the logs', {}))
    },
    async close() {
      this.$root.flow.showDev = false
    },
    async clearLocalCache() {
      const prefix = app.currentMailbox + ":"
      const keys = [
        "emails/",
        "threads/",
        "emails/inbox",
        "emails/fullInbox",
        "emails/special"
      ]
      await Promise.all(keys.map(async key => {
        await Satellite.del(prefix + key)
      }))
      window.location.reload()
    },
  }
})