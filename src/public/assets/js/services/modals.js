const MODALS_TAG = ['%c[MODALS API]', 'background-color: #ff7895; color: #000;']

const modalmanager = {
  data: {
    addMailbox: false,
    forceAddMailbox: false,
    addBoard: false,
    viewEmail: null,
    showDev: false
  },
  watch: {
    forceAddMailbox (f, _) {
      this.addMailbox = f || this.addMailbox
    }
  },
  methods: {
  }
}
