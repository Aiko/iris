Vue.component('view-thread', {
  props: ['thread'],
  data () {
    return {
      avatar: 'assets/img/avatar.png',
      fullThread: this.thread,
      email: this.thread.emails[0]
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
    this.email = ((thread, sentFolder) => {
      for (const email of thread.emails) {
        const sentLoc = email.locations.filter(({ folder }) => folder == sentFolder)?.[0]
        if (!sentLoc) return email
      }
      return thread.emails?.[0]
    })(this.thread, this.$root.folders.sent)

    this.avatar = await this.email.M.envelope.from.address.getAvatar() //* in utils.js we added this to string proto

    //? fetch the full thread
    this.fullThread = await this.$root.engine.api.get.thread(this.thread.tid)
    this.email = ((thread, sentFolder) => {
      console.log(thread)
      for (const email of thread.emails) {
        const sentLoc = email.locations.filter(({ folder }) => folder == sentFolder)?.[0]
        if (!sentLoc) return email
      }
      return thread.emails?.[0]
    })(this.fullThread, this.$root.folders.sent)
  },
  methods: {
    close () {
      this.$root.viewThread = null
      this.$root.focused.view = false
    }
  }
})
