Vue.component('view-email', {
  props: ['email', 'expanded', 'tid'],
  template: '#view-email',
  data () {
    return {
      showSenderInfo: false,
    }
  },
  computed: {
    loading () {
      return !(this.email.parsed.html)
    },
    iframeId () {
      return 'content-' + this.email.M.envelope.mid
    }
  },
  watch: {
    email (_) {
      if (this.email.parsed.html) this.setContent()
    },
  },
  methods: {
    async setContent (blank) {
      //? grab the corresponding iframe
      const iframeID = this.iframeId
      const el = document.getElementById(iframeID)

      //? reset the height (or if we don't have it try again)
      if (el) el.style.height = '0px'
      else return setTimeout(this.setContent, 100)

      //? reset the scroll
      $('.email-body').scrollTop(0)

      //? write the HTML into the iframe
      const doc = el.contentWindow.document
      doc.open()
      doc.clear()
      // TODO: there HAS to be a better way to load http inside https safely
      const content = this.email.parsed.html
      doc.write(content)
      doc.close()

      //? this is a really high level CS technique called "throw stuff against the wall and see what sticks" 🤌🏾
      try {
        $('#' + iframeID).load(function () {
          document.getElementById(iframeID).style.height = Math.max(document.getElementById(iframeID).contentWindow.document.body.offsetHeight, document.getElementById(iframeID).contentWindow.document.body.scrollHeight) + 'px'
        })
      } catch (e) { }
      document.getElementById(iframeID).style.height = Math.max(document.getElementById(iframeID).contentWindow.document.body.offsetHeight, document.getElementById(iframeID).contentWindow.document.body.scrollHeight) + 'px'
      // Don't judge me. It works.
      setTimeout(function () {
        document.getElementById(iframeID).style.height = Math.max(document.getElementById(iframeID).contentWindow.document.body.offsetHeight, document.getElementById(iframeID).contentWindow.document.body.scrollHeight) + 'px'
      }, 100)
      setTimeout(function () {
        document.getElementById(iframeID).style.height = Math.max(document.getElementById(iframeID).contentWindow.document.body.offsetHeight, document.getElementById(iframeID).contentWindow.document.body.scrollHeight) + 'px'
      }, 200)
      setTimeout(function () {
        document.getElementById(iframeID).style.height = Math.max(document.getElementById(iframeID).contentWindow.document.body.offsetHeight, document.getElementById(iframeID).contentWindow.document.body.scrollHeight) + 'px'
      }, 500)

      //? make sure all the links open in new windows to trigger the external flow in electron
      const links = doc.links
      for (let i = 0; i < links.length; i++) {
        links[i].target = '_blank'
      }
    },
    async starMessage () {
      const thread = this.$root.resolveThread(this.tid)
      if (!thread.syncing) {
        //? update UI right away
        thread.starred = true
        this.email.M.flags.starred = true
        const i = thread.emails.indexOf(this.email)
        if (i) thread.emails[i].M.flags.starred = true
        else window.error("View Email: Failed to find the email you are starring in its thread as resolved from TID.")
        this.$root.saveThread(thread, reset=false)

        //? perform the star
        this.$root.engine.headers.star(this.email.folder, this.email.M.envelope.uid)
      }
    },
    async unstarMessage () {
      const thread = this.$root.resolveThread(this.tid)
      if (!thread.syncing) {
        //? update UI right away
        thread.starred = false
        this.email.M.flags.starred = false
        const i = thread.emails.indexOf(this.email)
        if (i) thread.emails[i].M.flags.starred = false
        else window.error("View Email: Failed to find the email you are unstarring in its thread as resolved from TID.")
        this.$root.saveThread(thread, reset=false)

        //? perform the star
        this.$root.engine.headers.unstar(this.email.folder, this.email.M.envelope.uid)
      }
    },
    async deleteMessage () {
      const thread = this.$root.resolveThread(this.tid)
      if (!thread.syncing) {
        const { folder, uid } = this.$root.locThread(thread)
        await this.$root.engine.api.manage.delete(folder, uid)
        const board = this.$root.boards.filter(({ path }) => path == thread.aikoFolder)?.[0]
        if (!board) return window.error("Tried to delete a message from a board that does not exist")
        const i = this.$root.boards.indexOf(board)
        const index = this.$root.boards[i].tids.indexOf(this.tid)
        this.$root.boards[i].splice(index, 1)
      }
    },
    async reply() {
      const email = this.email
      //? if it is an email you sent, then we use the same recipient list
      const is_sent = email.locations.filter(({ folder }) => folder == sentFolder)?.[0]
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
      const email = this.email
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
        withMessageId=email.m.envelope.mid
      )
    },
    async forward() {
      const email = this.email
      this.$root.openComposer(
        withTo=[],
        withCC=[],
        withBCC=[],
        withSubject="Fwd: " + email.M.envelope.subject,
        withQuoted='',
        withMessageId=email.M.envelope.mid
      )
    },
  },
})
