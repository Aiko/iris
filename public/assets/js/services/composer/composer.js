const COMPOSER_TAG = ['%c[COMPOSER]', 'background-color: #b7c4a3; color: #000;']

const composer = {
  data: {
    smtpConfig: {
      email: '',
      host: '',
      port: 587,
      user: '',
      pass: '',
      oauth: '',
      secure: true,
      provider: 'other'
    },
    sendTo: [],
    sendCC: [],
    sendBCC: [],
    subject: '',
    quoted: '',
    messageId: '',
    composerEngine: null,
    templates: []
  },
  created () {
    info(...COMPOSER_TAG, 'Mounted composer mixin. Please ensure this only ever happens once.')
  },
  methods: {
    async initSMTP () {
      info(...COMPOSER_TAG, 'Loading address cache...')
      const mailboxes = (await Satellite.load('mailboxes')) || []
      info(...COMPOSER_TAG, 'Loading previously selected mailbox')
      let currentEmail = await Satellite.load('current-mailbox')
      if (!currentEmail) {
        if (mailboxes.length > 0) {
          currentEmail = mailboxes[0]
        } else {
          // we don't do anything.
          // the mailbox modal will be shown automatically by mailapi.
          return
        }
      }
      info(...COMPOSER_TAG, 'Loading SMTP config for', currentEmail)
      await this.loadSMTPConfig(currentEmail)
      //? load and check OAuth tokens
      await this.loadOAuthConfig()
      await this.checkOAuthTokens()
    },
    async saveSMTPConfig () {
      await Satellite.store(this.smtpConfig.email + '/smtp-config', this.smtpConfig)
    },
    async loadSMTPConfig (email) {
      this.smtpConfig = await Satellite.load(email + '/smtp-config')
    },
    task_OpenComposer (bang) {
      return this.ipcTask('please open the composer', { bang })
    },
    async openComposer (
      withTo=[],
      withCC=[],
      withBCC=[],
      withSubject='',
      withQuoted='',
      withMessageId=''
    ) {
      const config = {
        smtp: this.smtpConfig,
        to: withTo,
        cc: withCC,
        bcc: withBCC,
        subject: withSubject,
        quoted: withQuoted,
        msgId: withMessageId,
        enginePort: this.engine?.port,
      }

      // cache with randomized identifier
      const identifier = String.random(12)

      await GasGiant.store('composer/composer-' + identifier, config)

      if (this.tour) this.tour.complete()

      await this.executeIPC(this.task_OpenComposer(identifier))
    },
    async loadComposer () {
      const identifier = this.bang
      if (!identifier) return window.error(...COMPOSER_TAG, 'No bang!')
      const config = await GasGiant.load('composer/' + identifier) //! switch to pop
      if (!config) return window.error(...COMPOSER_TAG, 'Config not found')
      this.smtpConfig = config.smtp
      this.sendTo = config.to || []
      this.sendCC = config.cc || []
      this.sendBCC = config.bcc || []
      this.subject = config.subject || ''
      this.quoted = config.quoted || ''
      this.messageId = config.msgId || ''
      this.composerEngine = Engine(config.enginePort)
      if (this.messageId && !this.quoted) {
        info(...COMPOSER_TAG, "Trying to fetch message for composer.")
        const tryToGetIt = async (that, max_tries=3, try_n=0) => {
          if (try_n >= max_tries) return null;
          info(...COMPOSER_TAG, "Try", try_n+1, "of", max_tries)
          const cached = await that.composerEngine.resolve.messages.full(that.messageId)
          if (cached) {
            that.quoted =
            '<br><br><blockquote style="color: purple">' +
            'On ' + (new Date(cached.M.envelope.date)).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'}) +
            ', ' + cached.M.envelope.from.name + ' <' + cached.M.envelope.from.address + '> wrote:<br><br>' + (cached.parsed?.html || '[Message was too long to include.]')
            + '</blockquote>'
          }
          if (!(cached.parsed?.html)) return await tryToGetIt(that, max_tries, try_n+1)
        }
        await tryToGetIt(this)
        console.log(this.quoted)
      }
      this.$refs.editor.setContent(this.quoted || '<br><br><p>Thanks,</p><p>John Doe</p><br><br><a href="https://helloaiko.com">Sent with Aiko Mail</a>')
    },
    task_SendEmail (mail) {
      return this.ipcTask('please send an email', {
        mail,
        config: this.smtpConfig
      })
    },
    async sendEmail(html, attachments=[], includeCSS=true) {
      const mail = {}

      const Me = await (this.engine || this.composerEngine).contacts.lookup(this.smtpConfig.email)?.[0]
      if (Me) mail.from = `${Me.name} <${Me.email}>`
      else mail.from = this.currentMailbox || this.imapConfig?.email || this.smtpConfig?.email

      mail.to = this.sendTo.map(recipient => recipient.value)
      mail.cc = this.sendCC.map(recipient => recipient.value)
      mail.bcc = this.sendBCC.map(recipient => recipient.value)
      mail.replyTo = this.currentMailbox

      mail.subject = this.subject || "No Subject"

      mail.html = html
      if (includeCSS) {
        const styledHTML = `
<html>
<body>
<link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;0,900;1,300;1,400;1,500;1,700&display=swap" rel="stylesheet" type="text/css">
<style>
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400;1,600;1,700;1,800&display=swap');

* {
    font-family: "Roboto", sans-serif !important;
}

pre {
    padding: 0.7rem 1rem !important;
    border-radius: 5px !important;
    background: #1f1f1f !important;
    color: #fff !important;
    font-size: 0.8rem !important;
    overflow-x: auto !important;
}

pre code {
    display: block !important;
}

p code {
    padding: 0.2rem 0.4rem !important;
    border-radius: 5px !important;
    font-size: 0.8rem !important;
    font-weight: 700 !important;
    background: rgba(0, 0, 0, 0.1) !important;
    color: rgba(0, 0, 0, 0.8) !important;
}

ol,
ul {
    padding-left: 1rem !important;
}

li>ol,
li>p,
li>ul {
    margin: 0 !important;
}

a {
    color: inherit !important;
}

blockquote {
    border-left: 3px solid rgba(0, 0, 0, 0.1) !important;
    color: rgba(0, 0, 0, 0.8) !important;
    padding-left: 0.8rem !important;
    font-style: italic !important;
}

blockquote p {
    margin: 0 !important;
}

img {
    max-width: 100% !important;
    border-radius: 3px !important;
}

table {
    border-collapse: collapse !important;
    table-layout: fixed !important;
    width: 100% !important;
    margin: 0 !important;
    overflow: hidden !important;
}

table td,
table th {
    min-width: 1em !important;
    border: 2px solid #ddd !important;
    padding: 3px 5px !important;
    vertical-align: top !important;
    -webkit-box-sizing: border-box !important;
    box-sizing: border-box !important;
    position: relative !important;
}

table td>*,
table th>* {
    margin-bottom: 0 !important;
}

table th {
    font-weight: 700 !important;
    text-align: left !important;
}

table .selectedCell:after {
    z-index: 2 !important;
    position: absolute !important;
    content: "";
    left: 0 !important;
    right: 0 !important;
    top: 0 !important;
    bottom: 0 !important;
    background: rgba(200, 200, 255, 0.4) !important;
    pointer-events: none !important;
}

table .column-resize-handle {
    position: absolute !important;
    right: -2px !important;
    top: 0 !important;
    bottom: 0 !important;
    width: 4px !important;
    z-index: 20 !important;
    background-color: #adf !important;
    pointer-events: none !important;
}

blockquote {
    margin: 0 0 1rem !important;
    border-left: 1px solid #b0b0b0 !important;
    padding-left: 10px !important;
    padding-bottom: 5px !important;
    margin-bottom: 10px !important;
    margin-top: 10px !important;
}

blockquote p {
    font-style: italic !important;
    font-weight: 400 !important;
}

code {
    font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
        "Courier New", monospace !important;
    font-size: 87.5% !important;
    color: #e83e8c !important;
    word-break: break-word;
    background: #1f1f1f !important;
    padding: 4px !important;
    border-radius: 3px !important;
}

p,
h1,
h2,
h3,
span,
h4 {
    color: #000 !important;
}

p {
    letter-spacing: 0.4px !important;
    font-size: 15px !important;
    margin-bottom: 0 !important;
}

.ProseMirror {
    height: 100% !important;
}

ul[data-type="todo_list"] {
    padding-left: 0 !important;
}

li[data-type="todo_item"] {
    display: -webkit-box !important;
    display: -ms-flexbox !important;
    display: flex !important;
    -webkit-box-orient: horizontal !important;
    -webkit-box-direction: normal !important;
    -ms-flex-direction: row !important;
    flex-direction: row !important;
}

.todo-checkbox {
    border: 2px solid #000 !important;
    height: 0.9em !important;
    width: 0.9em !important;
    -webkit-box-sizing: border-box !important;
    box-sizing: border-box !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    cursor: pointer !important;
    border-radius: 0.2em !important;
    background-color: transparent !important;
    -webkit-transition: background 0.4s !important;
    transition: background 0.4s !important;
    display: table-cell !important;
}

li[data-done="true"]>.todo-content>p {
    margin-top: 0 !important;
}

.todo-content {
    display: table-cell !important;
    padding-left: 7px !important;
}

.todo-content>p:last-of-type {
    margin-bottom: 0 !important;
}

.todo-content>ul[data-type="todo_list"] {
    margin: 0.5rem 0 !important;
}

li[data-done="true"]>.todo-content>p {
    text-decoration: line-through !important;
}

li[data-done="true"]>.todo-checkbox {
    background-color: #000 !important;
}

li[data-done="false"] {
    text-decoration: none !important;
}

.actions[data-v-2ca5c7eb],
.export[data-v-2ca5c7eb] {
    max-width: 30rem !important;
    margin: 0 auto 2rem !important;
}

.export pre[data-v-2ca5c7eb] {
    padding: 1rem !important;
    border-radius: 5px !important;
    font-size: 0.8rem !important;
    font-weight: 700 !important;
    background: rgba(0, 0, 0, 0.05) !important;
    color: rgba(0, 0, 0, 0.8) !important;
}

.export code[data-v-2ca5c7eb] {
    display: block !important;
    white-space: pre-wrap !important;
}
</style>
${html}
</body>
`
        mail.html = styledHTML
      }
      mail.generateTextFromHTML = true

      mail.attachments = attachments.map(attachment => {
        return {
          filename: attachment.name,
          contentType: attachment.type,
          path: attachment.data
        }
      })

      if (window.location.pathname.includes('compose.html')) this.hide()
      const s = await this.callIPC(this.task_SendEmail(mail))
      info(...COMPOSER_TAG, "Sent email.")
      if (window.location.pathname.includes('compose.html')) this.close()
    },
    async listTemplates() {
      this.templates = await this.callIPC(this.ipcTask("list templates", {}))
    },
    async addTemplate() {
      throw new Error("Add template not implemented")
      /*
      await app.executeIPC(app.ipcTask("add template", {
        entry: {
          title: "Not interested",
          created: new Date(),
          uses: 0,
          id: String.random(8)
        },
        content: {
          html: "<p>Hi {{FIRSTNAME}},</p><p></p><p>Thanks for reaching out. Unfortunately at this time we are not interested in your services/offering. I will reach out to you if the situation changes.</p><p></p><p>Cheers,</p><p>Milky</p>"
        }
      }))
      */
    },
    async getTemplate(id) {
      const template = await this.callIPC(this.ipcTask("get template", {id,}))

      if (this.sendTo?.[0]) {
        const fname = this.sendTo?.[0].display.split(' ')[0]
        template.html = template.html.replace("{{FIRSTNAME}}", fname)
      }

      this.$refs.editor.setContent(
        this.quoted ?
        (template.html + this.quoted)
        : template.html)
    },
    async deleteTemplate(id) {
      await this.callIPC(this.ipcTask("delete template", {id, }))
      await this.listTemplates()
    }
  }
}
