const FLOW_TAG = ['%c[FLOW API]', 'background-color: #ff7895; color: #000;']

const flow_mgr = {
  data: {
    flow: {
      addMailbox: false,
      forceAddMailbox: false,
      addBoard: false,
      viewThread: null,
      showDev: false,
      regularView: false,
      showInboxBoardActions: false,
      showInboxBoardControls: false,
      showBoardRules: false,
      showNotifications: false,
      showSent: false,
    },
  },
  watch: {
    'flow.forceAddMailbox': function (f, _) {
      this.flow.addMailbox = f || this.flow.addMailbox
    },
    'flow.regularView': function (_) {
      this.recalculateHeight()
    },
    'flow.showSent': function (_) {
      remote.shell.openExternal('https://mail.google.com/mail/u/0/#sent')
    },
  },
  methods: {
  }
}
