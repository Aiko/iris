Vue.component('email-card', {
  template: '#email-card',
  props: ['email', 'board', 'inbox', 'index', 'focusedFolder', 'focusedIndex', 'viewFocused', 'render', 'quickFocused'],
  watch: {
    focusedFolder () {
      if (this.email.folder == this.focusedFolder && this.index == this.focusedIndex) {
        this.$el.scrollIntoViewIfNeeded()
      }
    },
    focusedIndex () {
      if (this.email.folder == this.focusedFolder && this.index == this.focusedIndex) {
        this.$el.scrollIntoViewIfNeeded()
      }
    },
    viewFocused () {
      if (this.email.folder == this.focusedFolder && this.index == this.focusedIndex && this.viewFocused) {
        this.viewMessage()
      }
    },
    quickFocused () {
      if (!this.quickFocused || (this.email.folder == this.focusedFolder && this.index == this.focusedIndex)) {
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
    }
  },
  methods: {
    async debug () {
      console.log(this.email)
      console.log(this.email.ai.thread)
      console.log(this.email.ai.threaded)
    },
    async deleteMessage () {
      if (!this.email.syncing) {
        this.email.ai.deleted = true
        await app.callIPC(
          app.task_DeleteEmails(
            this.email.folder,
            this.email.uid
          )
        )
        if (this.email.inboxUID) {
          await app.callIPC(
            app.task_DeleteEmails(
              'INBOX',
              this.email.inboxUID
            )
          )
        }
        this.saveToCache()
      }
    },
    async saveToCache () {
      return
      if (this.inbox) {
        log('Saving to inbox.')
        Vue.set(app.inbox.emails, this.index, this.email)
      } else {
        log('Saving to board.')
        Vue.set(app.boards[this.board].emails, this.index, this.email)
      }

      if (this.email.folder == 'INBOX') {
        log('Inbox should auto-save.')
      } else {
        await BigStorage.store(app.imapConfig.email + '/boards', app.boards)
      }
    },
    async starMessage () {
      if (!this.email.syncing) {
        log('Starring', this.email.folder, ':', this.email.uid)
        // update view model asap
        this.email.ai.starred = true
        // if it's already flagged but not starred idk?
        // its a bug but fuck it, can ignore
        if (this.email.flags.includes('\\Flagged')) return window.error('Was already starred!')
        this.email.flags.push('\\Flagged')
        await app.callIPC(
          app.task_SetFlags(
            this.email.folder,
            this.email.uid,
            {
              set: this.email.flags
            }
          )
        )
        if (this.email.inboxUID) {
          await app.callIPC(
            app.task_SetFlags(
              'INBOX',
              this.email.inboxUID,
              {
                set: this.email.flags
              }
            )
          )
        }

        // update view model
        this.saveToCache()
      }
    },
    async unstarMessage () {
      if (!this.email.syncing) {
        // update view model asap
        this.email.ai.starred = false
        // if it's already unflagged but not unstarred idk?
        // its a bug but fuck it, can ignore
        if (!(this.email.flags.includes('\\Flagged'))) return
        this.email.flags = this.email.flags.filter(flag =>
          flag != '\\Flagged'
        )
        await app.callIPC(
          app.task_SetFlags(
            this.email.folder,
            this.email.uid,
            {
              set: this.email.flags
            }
          )
        )
        if (this.email.inboxUID) {
          await app.callIPC(
            app.task_SetFlags(
              'INBOX',
              this.email.inboxUID,
              {
                set: this.email.flags
              }
            )
          )
        }
        this.saveToCache()
      }
    },
    async viewMessage () {
      app.viewEmail = this.email
      this.email.ai.seen = true
    },
    async openVerify () {
      if (this.email.ai?.links?.verify) {
        remote.shell.openExternal(this.email.ai.links.verify)
      }
    },
    async reply() {
      const email = this.email
      app.openComposer(
        withTo=(this.email.envelope.from || this.email.envelope.sender || []).map(
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
      const ogTo = email.envelope.to.length > 1 ? (email.envelope.to || []).filter(
        r => r.address != app.currentMailbox
      ).map(
        ({name, address}) => {return {value: address, display: name}}
      ) : [];
      app.openComposer(
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
      app.openComposer(
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
      const cached = await BigStorage.load(app.smtpConfig.email + '/emails/' + this.email.messageId)
      if (cached) {
        const quoted = cached?.parsed?.html || (cached?.parsed?.text || cached?.parsed?.msgText)?.replace(/\n/gim, '<br><br>')
        html = `<p>${this.replyText}</p><br><blockquote>${quoted}</blockquote>`
      } else {
        html = `<p>${this.replyText}</p>`
      }

      const email = this.email

      const ogCC = (email.envelope.cc || []).map(
        ({name, address}) => {return {value: address, display: name}}
      );
      const ogTo = email.envelope.to.length > 1 ? (email.envelope.to || []).filter(
        r => r.address != app.currentMailbox
      ).map(
        ({name, address}) => {return {value: address, display: name}}
      ) : [];

      app.sendTo = (this.email.envelope.from || this.email.envelope.sender || []).map(
        ({name, address}) => {return {value: address, display: name}}
      );
      app.sendCC = [...ogCC, ...ogTo]
      app.sendBCC = []
      app.subject = 'Re: ' + email.envelope.subject

      this.showQuickReply = false
      app.sendEmail(html)
    },
    async focus() {
      await Vue.nextTick()
      this.$refs.quickreply.focus()
    },
    async unfocus() {
      if (app.focused.quickReply) app.focused.quickReply = false
      else this.showQuickReply = false
    }
  }
})
