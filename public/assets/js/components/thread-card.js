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
  data() {
    return {
      showQuickReply: false,
      replyText: '',
      quickReplyAll: false,
    }
  },
  methods: {
    async debug () {
      console.log(this.thread)
    },
    async deleteMessage () {
      if (!this.thread.syncing) {
        const { folder, uid } = this.$root.locThread(this.thread)
        await this.$root.engine.api.manage.delete(folder, uid)
        const board = this.$root.boards.filter(({ name }) => name == slug)?.[0]
        if (!board) return window.error("Tried to delete a message from a board that does not exist")
        const i = this.$root.boards.indexOf(board)
        this.$root.boards[i].splice(index, 1)
      }
    },
    async starMessage () {
      if (!this.thread.syncing) {
        log('Starring thread', tid)
        // update view model asap
        this.thread.starred = true
        this.thread.emails[0].M.flags.starred = true
        this.$root.saveThread(this.thread, reset=false)

        this.$root.engine.headers.star(this.thread.emails[0].folder, this.thread.emails[0].M.envelope.uid)
      }
    },
    async unstarMessage () {
      if (!this.thread.syncing) {
        log('Unstarring thread', tid)
        // update view model asap
        this.thread.starred = false
        this.thread.emails[0].M.flags.starred = false
        this.$root.saveThread(this.thread, reset=false)

        this.$root.engine.headers.unstar(this.thread.emails[0].folder, this.thread.emails[0].M.envelope.uid)
      }
    },
    async viewMessage () {
      this.$root.viewThread = this.thread
      this.thread.seen = true
      this.thread.emails[0].M.flags.seen = true
      this.$root.saveThread(this.thread, reset=false)

      await this.$root.engine.headers.read(this.thread.emails[0].folder, this.thread.emails[0].M.envelope.uid)
    },
    async openVerify () {
      if (this.thread.emails[0].M.quick_actions.context) {
        remote.shell.openExternal(this.thread.emails[0].M.quick_actions.context)
      }
    },
    async reply() {
      /*
        ! this didn't make sense.
        //? the email replied to is the latest message not in sent
        //? unless all messages are in sent, then it is the latest message
        const email = ((thread, sentFolder) => {
          for (const email of thread.emails) {
            const sentLoc = email.locations.filter(({ folder }) => folder == sentFolder)?.[0]
            if (!sentLoc) return email
          }
          return thread.emails?.[0]
        })(this.thread, this.$root.folders.sent)
      */
      const email = this.thread.emails[0]
      //? if it is an email you sent, then we use the same recipient list
      const is_sent = email.locations.filter(({ folder }) => folder == sentFolder)?.[0]
      this.$root.openComposer(
        withTo=(is_sent ? email.M.envelope.to.map(({ name, address }) => {
          return { display: name, value: address }
        }) : [{
          display: email.M.envelope.from.name,
          value: email.M.envelope.from.address
        }]),
        withCC=[],
        withBCC=[],
        withSubject="Re: " + email.M.envelope.subject,
        withQuoted='',
        withMessageId=email.M.envelope.mid
      )
    },
    async replyAll() {
      const email = this.email
      const ogCC = (email.envelope.cc || []).map(
        ({name, address}) => {return {value: address, display: name}}
      );
      const ogTo = (email.envelope.to.length > 1 && (email.envelope.bcc || []).length == 0) ? (email.envelope.to || []).filter(
        r => r.address != this.$root.currentMailbox
      ).map(
        ({name, address}) => {return {value: address, display: name}}
      ) : [];
      this.$root.openComposer(
        withTo=(this.email.envelope.from || this.email.envelope.sender || []).map(
          ({name, address}) => {return {value: address, display: name}}
        ),
        withCC=[...ogCC, ...ogTo],
        withBCC=[],
        withSubject="Re: " + email.envelope.subject,
        withQuoted='',
        withMessageId=email.parsed.messageId
      )
    },
    async forward() {
      const email = this.email
      this.$root.openComposer(
        withTo=[],
        withCC=[],
        withBCC=[],
        withSubject="Fwd: " + email.envelope.subject,
        withQuoted='',
        withMessageId=email.parsed.messageId
      )
    },
    async sendQuickReply() {
      let html;
      const cached = await BigStorage.load(this.$root.smtpConfig.email + '/emails/' + this.email.messageId)
      if (cached) {
        const quoted = cached?.parsed?.html || (cached?.parsed?.text || cached?.parsed?.msgText)?.replace(/\n/gim, '<br><br>')
        html = `<p>${this.replyText}</p><br><blockquote>${quoted}</blockquote>`
      } else {
        html = `<p>${this.replyText}</p>`
      }

      const email = this.email

      if (this.quickReplyAll) {
        const ogCC = (email.envelope.cc || []).map(
          ({name, address}) => {return {value: address, display: name}}
        );
        const ogTo = (email.envelope.to.length > 1 && (email.envelope.bcc || []).length == 0) ? (email.envelope.to || []).filter(
          r => r.address != this.$root.currentMailbox
        ).map(
          ({name, address}) => {return {value: address, display: name}}
        ) : [];
        this.$root.sendCC = [...ogCC, ...ogTo]
      } else {
        this.$root.sendCC = []
      }

      this.$root.sendTo = (this.email.envelope.from || this.email.envelope.sender || []).map(
        ({name, address}) => {return {value: address, display: name}}
      );
      this.$root.sendBCC = []
      this.$root.subject = 'Re: ' + email.envelope.subject

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
