Vue.component('view-email', {
  props: ['email', 'expanded', 'tid'],
  template: '#view-email',
  data () {
    return {
      showSenderInfo: false,
      thread: this.$root.resolveThread(this.tid),
      avatar: 'assets/img/avatar.png'
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
    async email (_) {
      console.log("Loaded email", this.email)
      if (this.email.parsed.html) this.setContent()
      this.avatar = await this.email.M.envelope.from.address.getAvatar()
    },
    expanded (_) {
      if (this.email.parsed.html) this.setContent()
    },
  },
  methods: {
    normalizeAddresses(addresses) {
      return addresses.map(({ name, address}) => {
        return {
          display: name, value: address
        }
      })
    },
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
      //? auto-detect links
      //! FIXME: twttr.txt.autoLinkHashtags breaks css
      //! linkifyHTML breaks everything too because of weird errors
      /*
      const autodetected_links = linkify.find(this.email.parsed.html)
      for (const { href, value } of autodetected_links) {
        this.email.parsed.html = this.email.parsed.html.replace(value,
          '<a target="_blank" href="' + href.replace('http:', 'https:') + '">' + value + '</a>'
        )
      }
      */
      /*
      const content = twttr.txt.autoLinkCashtags(linkifyHtml(
        this.email.parsed.html.replace(/\!doctype/gi, 'random'), {
          defaultProtocol: 'https' //? enforce HTTPS
        }
      ))
      */
      const content = this.email.parsed.html
      // const content = twttr.txt.autoLinkCashtags(this.email.parsed.html)
      doc.write(content)
      doc.close()

      const body = doc.body
      body.innerHTML = twttr.txt.autoLinkCashtags(linkifyHtml(
        body.innerHTML, {
          defaultProtocol: 'https' //? enforce HTTPS
        }
      ))

      //? default styling
      if (!body.style.fontFamily) body.style.fontFamily = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"'
      if (!body.style.color && !body.style.backgroundColor && !body.style.background) {
        // TODO: dark mode styling can go here
      }
      if (!body.style.padding) body.style.padding = '15px'

      //? make sure all the links open in new windows to trigger the external flow in electron
      const links = doc.links
      for (let i = 0; i < links.length; i++) {
        links[i].target = '_blank'
      }

      //? this is a really high level CS technique called "throw stuff against the wall and see what sticks" 🤌🏾
      try {
        $('#' + iframeID).load(function () {
          document.getElementById(iframeID).style.height = Math.max(document.getElementById(iframeID).contentWindow.document.body.offsetHeight, document.getElementById(iframeID).contentWindow.document.body.scrollHeight) + 'px'
        })
      } catch (e) { }
      try {
        document.getElementById(iframeID).style.height = Math.max(document.getElementById(iframeID).contentWindow.document.body.offsetHeight, document.getElementById(iframeID).contentWindow.document.body.scrollHeight) + 'px'
      } catch (e) { }
      try {
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
      } catch (e) { }
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
        this.$root.engine.manage.star(this.email.folder, this.email.M.envelope.uid)
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
        this.$root.engine.manage.unstar(this.email.folder, this.email.M.envelope.uid)
      }
    },
    async deleteMessage () {
      const thread = this.$root.resolveThread(this.tid)
      if (!thread.syncing) {
        const { folder, uid } = this.$root.locThread(thread)
        await this.$root.engine.manage.delete(folder, uid)
        if (thread.aikoFolder != "INBOX") {
          const board = this.$root.boards.filter(({ path }) => path == thread.aikoFolder)?.[0]
          if (!board) return window.error("Tried to delete a message from a board that does not exist")
          const i = this.$root.boards.indexOf(board)
          const index = this.$root.boards[i].tids.indexOf(this.tid)
          this.$root.boards[i].tids.splice(index, 1)
        }
        else {
          const i = this.$root.inbox.indexOf(thread.tid)
          this.$root.inbox.splice(i, 1)
        }
        this.$root.flow.viewThread = null
      }
    },
    async reply() {
      const email = this.email
      //? if it is an email you sent, then we use the same recipient list
      const is_sent = email.locations.filter(({ folder }) => folder == this.$root.folders.sent)?.[0]
      this.$root.openComposer(
        withTo=(is_sent ?
          this.normalizeAddresses(email.M.envelope.to)
          : this.normalizeAddresses([email.M.envelope.from])
        ),
        withCC=[],
        withBCC=[],
        withSubject="Re: " + email.M.envelope.cleanSubject,
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
        withSubject="Re: " + email.M.envelope.cleanSubject,
        withQuoted='',
        withMessageId=email.M.envelope.mid
      )
    },
    async forward() {
      const email = this.email
      this.$root.openComposer(
        withTo=[],
        withCC=[],
        withBCC=[],
        withSubject="Fwd: " + email.M.envelope.cleanSubject,
        withQuoted='',
        withMessageId=email.M.envelope.mid
      )
    },
    //? Quick Actions
    async openVerify () {
      if (this.email.M.quick_actions.context) {
        remote.shell.openExternal(this.email.M.quick_actions.context)
      }
    },
    async copyOTP () {
      if (this.email.M.quick_actions.otp) {
        window.copy(this.email.M.quick_actions.otp)
      }
    },
  },
})
