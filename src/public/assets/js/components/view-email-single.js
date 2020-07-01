Vue.component('view-email-single', {
  props: ['emailsingle', 'expanded', 'validity'],
  template: '#view-email-single',
  data () {
    return {
      email: this.emailsingle,
      loading: true,
    }
  },
  computed: {
    sender () {
      return this?.email?.envelope?.from?.[0] || this?.email?.envelope?.sender?.[0] || {
        address: 'No Sender',
        name: 'No Sender'
      }
    },
    to () {
      return this?.email?.envelope?.to || [{
        address: 'Hidden Recipients',
        name: 'Hidden Recipients'
      }]
    },
    cc () {
      return this?.email?.cc || []
    },
    boards () {
      return app.boardNames.map(b => {
        return {
          folder: b,
          name: b.replace('[Aiko Mail]/', '')
        }
      })
    },
    iframeId () {
      return this.email.folder + '-' + this.email.uid
    }
  },
  watch: {
    validity (is, was) {
      if (is < was) return;
      this.email = this.emailsingle
      if (is > was) this.setContent()
    },
    emailsingle (_) {
      this.email = this.emailsingle
      if (this.validity > 100) this.setContent()
    },
  },
  methods: {
    async detectFlags () {
      this.email.ai.starred = this.email.flags.includes('\\Flagged')
      this.emailsingle.ai.starred = this.email.ai.starred
    },
    async setContent (blank) {
      this.detectFlags()
      const iframeID = this.iframeId
      const el = document.getElementById(iframeID)
      if (el) el.style.height = '0px'
      else return setTimeout(this.setContent, 100) // try every 100ms
      $('.email-body').scrollTop(0)
      const doc = el.contentWindow.document
      doc.open()
      doc.clear()
      // TODO: there HAS to be some way to load http inside https safely
      //* maybe local proxy?
      let textToWrite = this.email.parsed?.html
      if (!textToWrite) {
        textToWrite = (this.email.parsed?.text || this.email.parsed?.msgText || blank || '').replace(/\n/gim, '<br><br>')
      }
      if (textToWrite) this.loading = false
      else this.loading = true
      doc.write(textToWrite)
      doc.close()
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
      const links = doc.links
      for (let i = 0; i < links.length; i++) {
        links[i].target = '_blank'
      }
    },
    async starMessage () {
      if (!this.email.syncing) {
        log('Starring', this.email.folder, ':', this.email.uid)
        // update view model asap
        this.email.ai.starred = true
        this.emailsingle.ai.starred = true
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
        this.emailsingle.ai.starred = false
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
    async deleteMessage () {
      if (!this.email.syncing) {
        this.email.ai.deleted = true
        this.emailsingle.ai.deleted = true
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
    async saveToCache() {
      // TODO: find email in normal arrays (inbox, boards, done etc) and change the starred/deleted status
      return
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
        withQuoted=email.parsed.html || (email.parsed.text || email.parsed.msgText)?.replace(/\n/gim, '<br><br>')
      )
    },
    async replyAll() {
      const email = this.email
      const ogCC = (email.envelope.cc || []).map(
        ({name, address}) => {return {value: address, display: name}}
      );
      const ogTo = (email.envelope.to.length > 1 && (email.envelope.bcc || []).length == 0) ? (email.envelope.to || []).filter(
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
        withQuoted=email.parsed.html || (email.parsed.text || email.parsed.msgText)?.replace(/\n/gim, '<br><br>')
      )
    },
    async forward() {
      const email = this.email
      app.openComposer(
        withTo=[],
        withCC=[],
        withBCC=[],
        withSubject="Fwd: " + email.envelope.subject,
        withQuoted=email.parsed.html || (email.parsed.text || email.parsed.msgText)?.replace(/\n/gim, '<br><br>')
      )
    },
  },
})
