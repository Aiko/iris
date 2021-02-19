Vue.component('thread-card', {
  template: '#thread-card',
  props: ['thread', 'index', 'slug', 'focusedFolder', 'focusedIndex', 'viewFocused', 'render', 'quickFocused'],
  watch: {
    focusedFolder () {
      if (this.thread.aikoFolder == this.focusedFolder && this.index == this.focusedIndex) {
        this.$el.scrollIntoViewIfNeeded()
      }
    },
    focusedIndex () {
      if (this.thread.aikoFolder == this.focusedFolder && this.index == this.focusedIndex) {
        this.$el.scrollIntoViewIfNeeded()
      }
    },
    viewFocused () {
      if (this.thread.aikoFolder == this.focusedFolder && this.index == this.focusedIndex && this.viewFocused) {
        this.viewMessage()
      }
    },
    quickFocused () {
      if (!this.quickFocused || (this.thread.aikoFolder == this.focusedFolder && this.index == this.focusedIndex)) {
        this.showQuickReply = this.quickFocused
      }
    },
    showQuickReply () {
      if (this.showQuickReply) this.focus()
    }
  },
  computed: {
    quickaction () {
      return this.thread.emails[0].M.quick_actions.classification
    },
    justMe () {
      return this.thread.participants.length == 0
    }
  },
  data() {
    return {
      showQuickReply: false,
      replyText: '',
      quickReplyAll: false,
    }
  },
  methods: {
    //? utility methods
    debug () {
      console.log(this.thread)
    },
    normalizeAddresses(addresses) {
      return addresses.map(({ name, address}) => {
        return {
          display: name, value: address
        }
      })
    },
    //? management button methods
    async deleteMessage () {
      if (!this.thread.syncing) {
        const { folder, uid } = this.$root.locThread(this.thread)
        await this.$root.engine.api.manage.delete(folder, uid)
        if (this.slug) {
          const board = this.$root.boards.filter(({ name }) => name == this.slug)?.[0]
          if (!board) return window.error("Tried to delete a message from a board that does not exist")
          const i = this.$root.boards.indexOf(board)
          this.$root.boards[i].tids.splice(this.index, 1)
        }
        else {
          const i = this.$root.inbox.indexOf(this.thread.tid)
          this.$root.inbox.splice(i, 1)
        }
      }
    },
    async starMessage () {
      const tid = this.thread.tid
      if (!this.thread.syncing) {
        log('Starring thread', tid)
        // update view model asap
        this.thread.starred = true
        this.thread.emails[0].M.flags.starred = true
        this.$root.saveThread(this.thread, reset=false)

        this.$root.engine.api.headers.star(this.thread.emails[0].folder, this.thread.emails[0].M.envelope.uid)
      }
    },
    async unstarMessage () {
      const tid = this.thread.tid
      if (!this.thread.syncing) {
        log('Unstarring thread', tid)
        // update view model asap
        this.thread.starred = false
        this.thread.emails[0].M.flags.starred = false
        this.$root.saveThread(this.thread, reset=false)

        this.$root.engine.api.headers.unstar(this.thread.emails[0].folder, this.thread.emails[0].M.envelope.uid)
      }
    },
    //? core logic for viewing message
    async viewMessage () {
      const tid = this.thread.tid
      this.thread.seen = true
      this.thread.emails[0].M.flags.seen = true
      this.$root.saveThread(this.thread, reset=false)
      this.$root.viewThread = this.thread

      await this.$root.engine.api.headers.read(this.thread.emails[0].folder, this.thread.emails[0].M.envelope.uid)
    },
    //? quick action interactions
    async openVerify () {
      const tid = this.thread.tid
      if (this.thread.emails[0].M.quick_actions.context) {
        remote.shell.openExternal(this.thread.emails[0].M.quick_actions.context)
      }
    },
    async copyOTP () {
      const tid = this.thread.tid
      if (this.thread.emails[0].M.quick_actions.otp) {
        window.copy(this.thread.emails[0].M.quick_actions.otp)
      }
    },
    //? interaction button methods
    async reply() {
      /*
        ! this didn't make sense.
        //? the email replied to is the latest message not in sent
        //? unless all messages are in sent, then it is the latest message
        const email = ((thread, this.$root.folders.sent) => {
          for (const email of thread.emails) {
            const sentLoc = email.locations.filter(({ folder }) => folder == this.$root.folders.sent)?.[0]
            if (!sentLoc) return email
          }
          return thread.emails?.[0]
        })(this.thread, this.$root.folders.sent)
      */
      const email = this.thread.emails[0]
      //? if it is an email you sent, then we use the same recipient list
      const is_sent = email.locations.filter(({ folder }) => folder == this.$root.folders.sent)?.[0]
      this.$root.openComposer(
        withTo=(is_sent ?
          this.normalizeAddresses(email.M.envelope.to)
          : this.normalizeAddresses([email.M.envelope.from])
        ),
        withCC=[],
        withBCC=[],
        withSubject="Re: " + email.M.envelope.subject,
        withQuoted='',
        withMessageId=email.M.envelope.mid
      )
    },
    async replyAll() {
      const email = this.thread.emails[0]
      const cc =  this.normalizeAddresses(email.M.envelope.cc)
      const to = this.normalizeAddresses(
        [email.M.envelope.from, ...email.M.envelope.to] //? don't need to check if it's one you sent bc of below
          .filter(({ address }) => address != this.$root.currentMailbox) //? don't reply to yourself lol
      )
      const bcc = this.normalizeAddresses(email.M.envelope.bcc)
      if (bcc.length > 0 && to.length > 1) {
        // TODO: should show a warning that you were BCC'ed but are reply-all'ing
      }
      this.$root.openComposer(
        withTo=to,
        withCC=cc,
        withBCC=[],
        withSubject="Re: " + email.M.envelope.subject,
        withQuoted='',
        withMessageId=email.M.envelope.mid
      )
    },
    async forward() {
      const email = this.thread.emails[0]
      this.$root.openComposer(
        withTo=[],
        withCC=[],
        withBCC=[],
        withSubject="Fwd: " + email.M.envelope.subject,
        withQuoted='',
        withMessageId=email.M.envelope.mid
      )
    },
    async sendQuickReply() {
      const email = this.thread.emails[0]
      const msg = await this.$root.engine.api.get.single(email.M.envelope.mid)
      const quoted = msg.parsed.html
      const html = `<p>${this.replyText}</p><br><blockquote>${quoted}</blockquote>`

      const cc =  this.normalizeAddresses(email.M.envelope.cc)
      const bcc = this.normalizeAddresses(email.M.envelope.bcc)
      const toAll = this.normalizeAddresses(
        [email.M.envelope.from, ...email.M.envelope.to] //? don't need to check if it's one you sent bc of below
          .filter(({ address }) => address != this.$root.currentMailbox) //? don't reply to yourself lol
      )
      const is_sent = email.locations.filter(({ folder }) => folder == this.$root.folders.sent)?.[0]
      const to = is_sent ? this.normalizeAddresses(email.M.envelope.to)
          : this.normalizeAddresses([email.M.envelope.from]);


      this.$root.sendTo = this.quickReplyAll ? toAll : to;
      this.$root.sendCC = this.quickReplyAll ? cc : [];
      this.$root.sendBCC = []
      this.$root.subject = 'Re: ' + email.M.envelope.subject

      this.showQuickReply = false
      this.$root.sendEmail(html)
    },
    async focus() {
      await Vue.nextTick()
      this.$refs.quickreply.focus()
    },
    async unfocus() {
      if (this.$root.focused.quickReply) this.$root.focused.quickReply = false
      else this.showQuickReply = false
    }
  }
})
