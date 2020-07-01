const COMPOSER_TAG = ['%c[COMPOSER]', 'background-color: #b7c4a3; color: #000;']

const composer = {
  data: {
    smtpConfig: {
      email: '',
      host: '',
      port: 587,
      user: '',
      pass: '',
      xoauth2: '',
      secure: true,
      provider: 'other'
    },
    sendTo: [],
    sendCC: [],
    sendBCC: [],
    subject: '',
    quoted: '',
    messageId: '',
  },
  created () {
    info(...COMPOSER_TAG, 'Mounted composer mixin. Please ensure this only ever happens once.')
  },
  methods: {
    async initSMTP () {
      info(...COMPOSER_TAG, 'Loading address cache...')
      const mailboxes = (await SmallStorage.load('mailboxes')) || []
      info(...COMPOSER_TAG, 'Loading previously selected mailbox')
      let currentEmail = await SmallStorage.load('current-mailbox')
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
      if (this.smtpConfig.provider == 'google') {
        info(...COMPOSER_TAG, 'Loading Google config...')
        await this.google_loadConfig()
        await this.google_checkTokens()
      }
    },
    async saveSMTPConfig () {
      await SmallStorage.store(this.smtpConfig.email + '/smtp-config', this.smtpConfig)
    },
    async loadSMTPConfig (email) {
      this.smtpConfig = await SmallStorage.load(email + '/smtp-config')
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
      withMessageId='',
    ) {
      // TODO: somehow make settings
      const config = {
        smtp: this.smtpConfig,
        to: withTo,
        cc: withCC,
        bcc: withBCC,
        subject: withSubject,
        quoted: withQuoted,
        msgId: withMessageId
      }

      // cache with randomized identifier
      const identifier = String.random(12)

      await BigStorage.store('composer/' + identifier, config)

      await this.executeIPC(this.task_OpenComposer(identifier))
    },
    async loadComposer () {
      const identifier = this.bang
      if (!identifier) return window.error(...COMPOSER_TAG, 'No bang!')
      const config = await BigStorage.pop('composer/' + identifier)
      if (!config) return window.error(...COMPOSER_TAG, 'Config not found')
      this.smtpConfig = config.smtp
      this.sendTo = config.to || []
      this.sendCC = config.cc || []
      this.sendBCC = config.bcc || []
      this.subject = config.subject || ''
      this.quoted = config.quoted || ''
      this.messageId = config.msgId || ''
      if (this.messageId && !this.quoted) {
        const cached = await BigStorage.load(this.smtpConfig.email + '/emails/' + this.messageId)
        if (cached) {
          this.quoted = cached?.parsed?.html || (cached?.parsed?.text || cached?.parsed?.msgText)?.replace(/\n/gim, '<br><br>')
        }
      }
    },
    task_SendEmail (mail) {
      return this.ipcTask('please send an email', {
        mail,
        ...this.smtpConfig
      })
    },
    async sendEmail(html, attachments=[], includeCSS=true) {
      const mail = {}

      const myName = (await this.suggestContact(this.smtpConfig.email))?.[0];
      if (myName) mail.from = `${myName[1]} <${this.smtpConfig.email}>`
      else mail.from = this.currentMailbox

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
* {
  font-family: "Roboto", sans-serif;
}
pre {
  padding: 0.7rem 1rem;
  border-radius: 5px;
  background: #000;
  color: #fff;
  font-size: 0.8rem;
  overflow-x: auto;
}

pre code {
  display: block;
}

p code {
  padding: 0.2rem 0.4rem;
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.8);
}

ol,
ul {
  padding-left: 1rem;
}

li > ol,
li > p,
li > ul {
  margin: 0;
}

a {
  color: inherit;
}

blockquote {
  border-left: 3px solid rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.8);
  padding-left: 0.8rem;
  font-style: italic;
}

blockquote p {
  margin: 0;
}

img {
  max-width: 100%;
  border-radius: 3px;
}

table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 0;
  overflow: hidden;
}

table td,
table th {
  min-width: 1em;
  border: 2px solid #ddd;
  padding: 3px 5px;
  vertical-align: top;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
  position: relative;
}

table td > *,
table th > * {
  margin-bottom: 0;
}

table th {
  font-weight: 700;
  text-align: left;
}

table .selectedCell:after {
  z-index: 2;
  position: absolute;
  content: "";
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(200, 200, 255, 0.4);
  pointer-events: none;
}

table .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  z-index: 20;
  background-color: #adf;
  pointer-events: none;
}

blockquote {
  margin: 0 0 1rem;
  border-left: 1px solid #b0b0b0;
  padding-left: 10px;
  padding-bottom: 5px;
  margin-bottom: 10px;
  margin-top: 10px;
}

blockquote p {
  font-style: italic;
  font-weight: 400;
}

code {
  font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace !important;
  font-size: 87.5%;
  color: #e83e8c !important;
  word-break: break-word;
  background: #1f1f1f !important;
  padding: 4px;
  border-radius: 3px;
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
  letter-spacing: 0.4px;
  font-size: 15px;
  margin-bottom: 0;
}

.ProseMirror {
  height: 100%;
}

ul[data-type="todo_list"] {
  padding-left: 0;
}

li[data-type="todo_item"] {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -webkit-box-orient: horizontal;
  -webkit-box-direction: normal;
  -ms-flex-direction: row;
  flex-direction: row;
}

.todo-checkbox {
  border: 2px solid #000;
  height: 0.9em;
  width: 0.9em;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
  margin-right: 10px;
  margin-top: 0.3rem;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
  border-radius: 0.2em;
  background-color: transparent;
  -webkit-transition: background 0.4s;
  transition: background 0.4s;
}

.todo-content {
  -webkit-box-flex: 1;
  -ms-flex: 1;
  flex: 1;
}

.todo-content > p:last-of-type {
  margin-bottom: 0;
}

.todo-content > ul[data-type="todo_list"] {
  margin: 0.5rem 0;
}

li[data-done="true"] > .todo-content > p {
  text-decoration: line-through;
}

li[data-done="true"] > .todo-checkbox {
  background-color: #000;
}

li[data-done="false"] {
  text-decoration: none;
}

.actions[data-v-2ca5c7eb],
.export[data-v-2ca5c7eb] {
  max-width: 30rem;
  margin: 0 auto 2rem;
}

.export pre[data-v-2ca5c7eb] {
  padding: 1rem;
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.8);
}

.export code[data-v-2ca5c7eb] {
  display: block;
  white-space: pre-wrap;
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

      await this.executeIPC(this.task_SendEmail(mail))

      info(...COMPOSER_TAG, "Sent email.")

      if (window.location.pathname.includes('compose.html')) this.close()
    },
  }
}
