Vue.component('view-thread', {
  props: ['thread'],
  data () {
    return {
      fullThread: this.thread,
      email: this.thread.emails[0],
      participants: this.thread.participants.map(participant => {
        participant.avatar = 'assets/img/avatar.png'
        return participant
      }),
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

    this.email = ((thread, sentFolder) => {
      for (const email of thread.emails) {
        const sentLoc = email.locations.filter(({ folder }) => folder == sentFolder)?.[0]
        if (!sentLoc) return email
      }
      return thread.emails?.[0]
    })(this.thread, this.$root.folders.sent)

    //? fetch avatars
    this.participants = await Promise.all(this.thread.participants.map(async participant => {
      participant.avatar = await participant.address?.getAvatar({ colorPalette: app.colorPalette })
      return participant
    }))

    //? fetch the almost full thread (which we are more likely to have cached)
    this.fullThread = await this.$root.engine.resolve.thread.content(this.thread.tid)
    this.email = ((thread, sentFolder) => {
      console.log(thread)
      for (const email of thread.emails) {
        const sentLoc = email.locations.filter(({ folder }) => folder == sentFolder)?.[0]
        if (!sentLoc) return email
      }
      return thread.emails?.[0]
    })(this.fullThread, this.$root.folders.sent)


    //? patch in the real full thread
    this.fullThread = await this.$root.engine.resolve.thread.full(this.thread.tid)
    this.email = ((thread, sentFolder) => {
      console.log(thread)
      for (const email of thread.emails) {
        const sentLoc = email.locations.filter(({ folder }) => folder == sentFolder)?.[0]
        if (!sentLoc) return email
      }
      return thread.emails?.[0]
    })(this.fullThread, this.$root.folders.sent)
  },
  computed: {
    board() {
      const folder = this.$root.locThread(this.thread)?.folder ?? "Uncategorized"
      return folder.replace("[Aiko]/", "")
    },
  },
  methods: {
    close () {
      this.$root.flow.viewThread = null
      this.$root.focused.view = false
    }
  }
})
