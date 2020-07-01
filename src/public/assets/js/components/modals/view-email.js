Vue.component('view-email', {
  props: ['emailcard'],
  data () {
    return {
      email: this.emailcard,
      thread: [],
      avatar: 'assets/img/avatar.png',
    }
  },
  async created () {
    //* bind escape to close
    const that = this
    document.addEventListener('keyup', function (evt) {
      if (evt.keyCode === 27) { //* escape
        that.close()
      }
    })
    //* first fetch the selected email without attachments
    const withoutAttachments = await app.executeIPC(app.task_FetchEmails(this.email.syncFolder || this.email.folder, this.email.uid, false, null, null, false, true, true))
    if (!this.email.parsed) this.emails.parsed = {}
    this.email.parsed.text = withoutAttachments?.parsed?.text
    this.email.parsed.html = withoutAttachments?.parsed?.html
    this.email.flags = withoutAttachments[0]?.flags
    this.email.validity = -1
    //* Update UI immediately
    this.email = JSON.parse(JSON.stringify(this.email))

    //* then fetch the selected email with attachments
    const s = await app.executeIPC(app.task_FetchEmails(this.email.syncFolder || this.email.folder, this.email.uid, false, null, null, true, true, false))
    if (!s?.[0]) {
      error(...MODALS_TAG, "Couldn't fetch selected email.")
      this.close()
      return
    }
    this.email.flags = s[0]?.flags
    this.email.parsed.text = s[0]?.parsed?.text
    this.email.parsed.html = s[0]?.parsed?.html
    this.email.parsed.attachments = s[0]?.parsed?.attachments
    this.email.validity = 1
    //* Update UI immediately
    this.email = JSON.parse(JSON.stringify(this.email))
    // this.email.parsed.attachments = s[0]?.parsed?.attachments || this.email.parsed?.attachments
    //* then fetch the thread
    if (this.email.parsed.thread?.messages?.length > 0) {
      const to_fetch = {}
      for (const threaded_email of this.email.parsed.thread.messages) {
        if (!to_fetch[threaded_email.folder]) to_fetch[threaded_email.folder] = []
        to_fetch[threaded_email.folder].push(eval(threaded_email.uid))
      }
      const emails = []
      for (const folder in to_fetch) {
        console.time('Fetching emails from ' + folder)
        const uids = to_fetch[folder].sort()
        const ranges = []
        for (let i = 0; i < uids.length;) {
          const min = uids[i]
          i++
          if (i < uids.length && (uids[i] == (uids[i - 1] + 1))) {
            while (i < uids.length && (uids[i] == (uids[i - 1] + 1))) i++
            const max = uids[i - 1]
            ranges.push(min + ':' + max)
          } else ranges.push(min)
        }
        const sequence = ranges.join(',')
        const fetched = await app.executeIPC(app.task_FetchEmails(
          folder, sequence, false, null, null, true, true, false
        ))
        console.timeEnd('Fetching emails from ' + folder)
        if (!fetched) {
          window.error(...MODALS_TAG, "Couldn't fetch threaded email. Skipping!")
        } else {
          console.time('Cleaning emails from ' + folder)
          const cleaned = await MailCleaner.base(folder, fetched)
          emails.push(...cleaned)
          console.timeEnd('Cleaning emails from ' + folder)
        }
      }
      this.email.parsed.thread.messages = this.email.parsed.thread.messages?.map(e => {
        const matches = emails.filter(e2 => e2.folder == e.folder && e2.uid == e.uid)
        if (matches.length > 0) {
          e.parsed = matches[0].parsed
          e.flags = matches[0].flags
        }
        else window.error(...MODALS_TAG, "Message in thread doesn't have a match:", e)
        return e
      })?.sort((e1, e2) => new Date(e2.envelope.date) - new Date(e1.envelope.date))
    }
    info(...MODALS_TAG, 'Here is your view email:', this.email)
    this.email = JSON.parse(JSON.stringify(this.email))
    this.email.validity = 9
    if (this.email?.parsed?.thread?.messages) this.email.parsed.thread.messages.map(m => m.validity = 9)
    this.avatar = await this.sender?.address?.getAvatar()
  },
  computed: {
    sender () {
      return this?.email?.envelope?.from?.[0] || this?.email?.envelope?.sender?.[0] || {
        address: 'No Sender',
        name: 'No Sender'
      }
    },
  },
  methods: {
    close () {
      app.viewEmail = null
      app.focused.view = false
    }
  }
})
