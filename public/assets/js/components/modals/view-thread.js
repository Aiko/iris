Vue.component('view-thread', {
  props: ['thread'],
  data () {
    return {
      avatar: 'assets/img/avatar.png',
      fullThread: this.thread,
    }
  },
  async created () {
    //? bind escape to close
    const that = this
    document.addEventListener('keyup', function (evt) {
      if (evt.keyCode === 27) { //! FIXME: deprecated
        that.close()
      }
    })

    //? fetch avatar
    this.avatar = await email.M.envelope.from.address.getAvatar() //* in utils.js we added this to string proto

    //? fetch the full thread
    this.fullThread = await this.$root.engine.api.get.thread(this.thread.tid)
    const email = this.thread.emails.filter(
      e => !(e.locations.filter(({ folder }) => folder == sentFolder)?.[0]))?.[0] || this.thread.emails[0]
  },
  methods: {
    close () {
      this.$root.viewThread = null
      this.$root.focused.view = false
    }
  }
})
