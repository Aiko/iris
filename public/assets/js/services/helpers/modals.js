const FLOW_TAG = ['%c[FLOW API]', 'background-color: #ff7895; color: #000;']

const flow_mgr = {
  data: {
    flow: {
      addMailbox: false,
      forceAddMailbox: false,
      addBoard: false,
      viewThread: null,
      showDev: false,
      regularView: false
    },
  },
  watch: {
    forceAddMailbox (f, _) {
      this.flow.addMailbox = f || this.flow.addMailbox
    },
    regularView (_) {
      this.recalculateHeight()
    },
  },
  methods: {
  }
}
