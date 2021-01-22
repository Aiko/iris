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

      this.$root.engine.headers.read(this.thread.emails[0].folder, this.thread.emails[0].M.envelope.uid)
    },
    async openVerify () {
      email.M.quick_actions.context = verify_links[0]
      email.M.quick_actions.classification = 'verify'
      if (this.thread.emails[0].M.quick_actions.context) {
        remote.shell.openExternal(this.thread.emails[0].M.quick_actions.context)
      }
    },
    async reply() {
      const email = this.email
      this.$root.openComposer(
        withTo=(this.thread.emails[0].envelope.from || this.thread.emails[0].envelope.sender || []).map(
          ({name, address}) => {return {value: address, display: name}}
        ),
        withCC=[],
        withBCC=[],
        withSubject="Re: " + email.envelope.subject,
        withQuoted='',
        withMessageId=email.parsed.messageId
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
