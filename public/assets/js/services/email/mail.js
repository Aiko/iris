const MAILAPI_TAG = ['%c[MAIL API]', 'background-color: #ffdddd; color: #000;']

const mailapi = {
  data: {
    engine: null,
    connected: false,
    imapConfig: {
      email: '',
      host: '',
      port: 993,
      user: '',
      pass: '',
      xoauth2: '',
      secure: true,
      provider: 'other'
    },
    //? Manages mailboxes loaded into Aiko Mail
    mailboxes: [],
    currentMailbox: '',
    /********************* */
    folderNames: {
      inbox: 'INBOX',
      sent: '',
      starred: '',
      spam: '',
      drafts: '',
      archive: '',
      trash: ''
    },
    boardNames: [],
    inbox: {
      uidLatest: -1,
      // modSeq: -1,
      emails: [],
      uidOldest: -1
    },
    boards: {},
    done: {
      uidLatest: -1,
      emails: []
    },
    syncing: false,
    syncingBoards: {},
    syncingDone: false,
    syncingInbox: false,
    seekingInbox: false, // seeking backwards into history
    cachingInbox: false,
    dragging: false,
    fullInbox: [],
    priorityInbox: [],
    otherInbox: [],
    lastSync: new Date(),
    lastSuccessfulSync: new Date(),
    syncTimeout: TIMEOUT,
    contacts: {
      allContacts: [],
      inboxUID: 1,
      // TODO: uids for other mailboxes
      // TODO: connect to contacts providers for google and office365
    },
    visibleMin: 0,
    visibleMax: 500, // most things visible
  },
  computed: {
    timeToNextSync () {
      const nextSync = new Date(this.lastSync.getTime() + this.syncTimeout)
      const diff = nextSync.getTime() - (new Date()).getTime()
      return Math.round(diff / 1000)
    }
  },
  watch: {
    'inbox.emails': async function (updatedInbox) {
      // NOTE: important to check length
      // dont want to store empty inbox if it is reset
      // if you need to store an empty inbox do it manually!
      // you also should set the uidLatest every time it has changed
      this.recalculateHeight()
      if (this.cachingInbox) return
      info(...MAILAPI_TAG, 'Will cache inbox.')
      this.cachingInbox = true
      setTimeout(async () => {
        if (updatedInbox.length > 0) {
          await BigStorage.store(app.imapConfig.email + '/inbox', {
            uidLatest: app.inbox.uidLatest,
            // modSeq: this.inbox.modSeq,
            emails: app.inbox.emails.slice(0,1000),
            uidOldest: app.inbox.uidLatest
          })
        }
        this.cachingInbox = false
      }, 3000)

      this.fullInbox = this.inbox.emails.filter(email =>
        email?.folder == 'INBOX' && !(email?.ai?.threaded)
      )
      this.priorityInbox = this.fullInbox.filter(email => email.ai.priority)
      this.otherInbox = this.fullInbox.filter(email => !email.ai.priority)
    },
    priority() {
      this.recalculateHeight()
      if (this.focused.folder == 'INBOX' && this.focused.index > -1) {
        if (this.priority) {
          const nextIndex = this.inbox.emails.map((email, i) => {
            return {email, i}
          }).filter(({email}) =>
              email?.ai?.priority &&
              !(email?.ai?.threaded) &&
              email.folder == 'INBOX' &&
              !(email?.ai?.deleted)
          )?.[0]?.i
          if (nextIndex) this.focused.index = nextIndex
        } else {
          const nextIndex = this.inbox.emails.map((email, i) => {
            return {email, i}
          }).filter(({email}) =>
              !email?.ai?.priority &&
              !(email?.ai?.threaded) &&
              email.folder == 'INBOX' &&
              !(email?.ai?.deleted)
          )?.[0]?.i
          if (nextIndex) this.focused.index = nextIndex
        }
      }
    }
  },
  created () {
    info(...MAILAPI_TAG, 'Mounted IMAP processor. Please ensure this only ever happens once.')
  },
  methods: {
    ////////////////////////////////////////////!
    //! IPC Tasks
    ////////////////////////////////////////////!
    //? IPC task to create a new Mouseion engine
    task_NewEngine () {
      return this.ipcTask('please start up a new engine', {})
    },
    ////////////////////////////////////////////!
    //! IMAP Configuration & Initialization
    ////////////////////////////////////////////!
    //? Selects the last opened mailbox (or forces an addition)
    //? Loads IMAP configuration
    //? Loads OAuth configuration & checks tokens
    async initIMAP () {
      info(...MAILAPI_TAG, 'Loading address cache...')
      this.mailboxes = (await SmallStorage.load('mailboxes')) || []

      //? determine what to use as our opened mailbox or force addition otherwise
      info(...MAILAPI_TAG, 'Loading previously selected mailbox')
      let currentEmail = await SmallStorage.load('current-mailbox')
      if (!currentEmail) {
        warn(...MAILAPI_TAG, 'There is no current email.')
        if (this.mailboxes.filter(_ => _).length > 0) {
          info(...MAILAPI_TAG, 'Selected first mailbox as current email.')
          currentEmail = this.mailboxes.filter(_ => _)[0]
        } else {
          error(...MAILAPI_TAG, 'There are no mailboxes. Forcing a mailbox addition.')
          this.forceAddMailbox = true
          return
        }
      }

      //? set the current mailbox
      this.currentMailbox = currentEmail

      //? load the relevant IMAP configuration
      info(...MAILAPI_TAG, 'Loading IMAP config...')
      await this.loadIMAPConfig(currentEmail)

      //? if it isn't correct then force a mailbox addition
      if (!this.imapConfig.email) {
        error(...MAILAPI_TAG, 'Was unable to load IMAP config. Most likely a Time Machine Effect.')
        this.forceAddMailbox = true
        return
      }

      //? load and check OAuth tokens
      await this.loadOAuthConfig()
      await this.checkOAuthTokens()
    },
    //? Saves the IMAP configuration to persistent cache
    async saveIMAPConfig () {
      await SmallStorage.store(this.imapConfig.email + '/imap-config', this.imapConfig)
    },
    //? Loads the IMAP configuration for an email from persistent cache
    async loadIMAPConfig (email) {
      this.imapConfig = await SmallStorage.load(email + '/imap-config')
    },
    ////////////////////////////////////////////!
    //! Engine Control
    ////////////////////////////////////////////!
    //? If an engine exists, shuts it down
    //? Then creates a new engine, and initializes it with the config
    //! This will restart your engine
    /*
      TODO: this should actually use an Engine Manager
      * more info: we should be creating an engine for each mailbox
      * and then, we assign the engine data object to this based on the engine for the mailbox
      * the engines in the background will still send notifications which is great!
    */
    async getEngine() {
      //? if the engine exists, shut it down
      if (this.engine) {
        this.engine.close()
        info(...MAILAPI_TAG, 'Shut down existing engine.')
        this.engine = null
      }

      //? start new Mouseion instance, get port
      const port = await this.callIPC(task_newEngine())
      info(...MAILAPI_TAG, 'Started a new engine on port', port)

      //? set engine and initialize it
      this.engine = new Engine(port)
      {
        host, port, user, pass, oauth, secure, //* config
        provider="other" //? defaults to other but accepts google, microsoft, etc
      }
      await this.engine.init({
        ...(this.imapConfig),
        oauth: this.imapConfig.xoauth2
      })
    },
    ////////////////////////////////////////////!
    //! Handlers & Sinks
    ////////////////////////////////////////////!
    //? A sink method to receive IMAP connection error calls
    // TODO: should do something on error
    async onIMAPConnectionError () {
      // NOTE: this is less of a listener and something this module calls
      // app.toastIMAPError()
    },
    ////////////////////////////////////////////!
    //! Mailserver Connection
    ////////////////////////////////////////////!
    //? Switches the current loaded mailbox to a new mailbox via email address
    //? Loads the IMAP configuration and, if available, the SMTP configuration
    //? Also loads OAuth tokens if using that strategy
    //? Ends by calling switchMailServer automatically
    //! Controls the loader
    async switchMailbox(email) {
      this.loading = true
      await this.loadIMAPConfig(email)
      if (this.loadSMTPConfig) await this.loadSMTPConfig(email)
      await this.loadOAuthConfig()
      this.loading = false
      await this.switchMailServer()
    },
    //? Switches to a new mailserver, controlled by the imapConfig
    //? Gets the engine for the current mailserver
    //* PRECONDITION: assumes imapConfig is your new mailbox
    //! CAUTION: this will switch the entire mailbox, UI-wise.
    async switchMailServer () {
      //? grab the lock on loader
      const controlsLoader = !(this.loading)
      if (controlsLoader) this.loading = true
      console.time('Switch Mailservers')

      //? Sanity check to make sure there is a current mailbox configuration
      if (!this.imapConfig?.email) {
        warn(...MAILAPI_TAG, 'Tried switching server but no current email.')
        if (controlsLoader) this.loading = false
        return false //! it's super bad if this happens
      }

      info(...MAILAPI_TAG, 'Switching mailbox to ' + this.imapConfig.email)

      //? add it to mailboxes if it's not already there
      if (!this.mailboxes.includes(this.imapConfig.email)) {
        this.mailboxes.push(this.imapConfig.email)
        await SmallStorage.store('mailboxes', this.mailboxes)
      }

      //? set it as the current mailbox
      this.currentMailbox = this.imapConfig.email
      await SmallStorage.store('current-mailbox', this.imapConfig.email)

      //? save IMAP/SMTP configurations as an extra measure
      //? in case this is being called on a new mailserver
      await this.saveIMAPConfig()
      if (this.saveSMTPConfig) await this.saveSMTPConfig()

      //? check OAuth tokens
      await this.checkOAuthTokens()

      //? (re)start the engine
      await this.getEngine()

      //? reset the UI
      this.inbox.emails = []
      // TODO: can probably treat done as just another board and have a special case for the UI of it
      this.done.emails = []
      this.boardNames = []

      info(...MAILAPI_TAG, "Starting engine sync.")
      await this.engine.sync.immediate()

      this.syncing = false
      this.cachingInbox = false

      //? save IMAP configuration again as an extra measure (in case the OAuth tokens updated)
      info(...MAILAPI_TAG, 'Saving config...')
      await this.saveIMAPConfig()

      // TODO: get the email data for full inbox from backend
      //? then, if its empty i.e. a new mailbox, show loader and await a sync

      console.timeEnd('SWITCH MAILBOX')

      if (controlsLoader) this.loading = false
      document.title = `Inbox - ${this.currentMailbox}`
      this.syncing = false
    },
    ////////////////////////////////////////////!
    //! Board Methods
    ////////////////////////////////////////////!
    // Utility methods
    folderWithSlug (slug) {
      if (!slug) {
        warn(...MAILAPI_TAG, 'Board slug is empty, defaulting to Uncategorized')
        slug = 'Uncategorized'
      }
      return `[Aiko Mail]/${slug}`
    },
    async boardCreate (slug) {
      if (!slug) {
        warn(...MAILAPI_TAG, 'Board slug is empty, defaulting to Uncategorized')
        slug = 'Uncategorized'
      }
      const path = this.folderWithSlug(slug)
      //? check if it already exists
      const folders = this.engine.folders.get()
      if (folders.aiko?.[slug]) return error(...MAILAPI_TAG, "Tried to create board with slug", slug, "but it already exists!")
      await this.engine.folders.add(path)
      //? confirm it was added
      const updatedFolders = this.engine.folders.get()
      if (!(updatedFolders.aiko?.[slug])) return error(...MAILAPI_TAG, "Tried to create board with slug", slug, "but failed to create the matching folder.")
      await this.engine.sync.add(path)
      Vue.set(this.boards, boardName, {
        emails: []
      })
      this.boardNames.push(boardName)
    },
    async suggestContact(term, limit=5) {
      const results = await this.engine.contacts.lookup(term)
      return results.slice(0, limit)
    },
    // TODO: probably don't need this
    async saveBoardCache () {
      const boardsCache = {}
      for (const board of this.boardNames) {
        const b = this.boards[board]
        boardsCache[board] = b
        boardsCache[board].emails = b.emails
          .filter(e => e.folder == board)
          .filter(e => e?.ai?.threaded != board)
        if (boardsCache[board].emails.length > 100) {
          warn(...MAILAPI_TAG, board + ' has too many emails to cache and will be truncated.')
          boardsCache[board].emails = boardsCache.emails.slice(0, 100)
        }
      }
      await BigStorage.store(this.imapConfig.email + '/boards', boardsCache)
      const doneCache = this.done
      doneCache.emails = this.done.emails
        .filter(e => e.folder == this.folderNames.done)
        .filter(e => e?.ai?.threaded != this.folderNames.done)
      if (doneCache.emails.length > 100) {
        warn(...MAILAPI_TAG, 'Done board has too many emails to cache and will be truncated.')
        doneCache.emails = doneCache.emails.slice(0, 100)
      }
      await BigStorage.store(this.imapConfig.email + '/done', doneCache)
    },
    // TODO: probably don't need this
    async cleanup () {
      for (const board of this.boardNames) {
        const mids = new Set()
        for (let i = 0; i < this.boards[board].emails.length; i++) {
          const mid = this.boards[board].emails[i].envelope['message-id']
          if (mids.has(mid)) {
            this.boards[board].emails.splice(i, 1)
            i--
          } else mids.add(mid)
        }
      }
    },
    // TODO: probably don't need this
    //? instead, how about a listener for events from the engine?
    //? maybe a sync started hook for ui update and sync ended hook to tell us to pull changes
    async updateAndFetch () {
      info(...MAILAPI_TAG, 'Running update and fetch.')
      // simply checkForUpdates and checkForNewMessages both
      if (this.syncing) return warn(...MAILAPI_TAG, 'Already syncing. Cancelling flow.')
      this.syncing = true
      await this.checkForNewMessages()
      await this.checkForUpdates()
      await this.halfThreading().catch(error)
      this.inbox.emails = this.inbox.emails.sort((e1, e2) => e2.envelope.date - e1.envelope.date)
      this.boards = JSON.parse(JSON.stringify(this.boards))
      await this.memoryLinking()
      await this.cleanup()
      this.syncing = false
    },
    // TODO: probably don't need this
    async checkForNewMessages () {
      const {
        uidNext
      } = await this.callIPC(this.task_OpenFolder('INBOX'))
      if (!uidNext) return error(...(MAILAPI_TAG), "Didn't get UIDNEXT.")

      if (this.inbox.uidLatest < 0 || uidNext - this.inbox.uidLatest > 200) {
        info(...MAILAPI_TAG, 'There are too many emails to update, need to sync.')
        // TODO: probably show a modal since this is blocking
        await this.initialSyncWithMailServer()
        return false
      }

      this.inbox.uidLatest = Math.max(...this.inbox.emails.map(email => email.inboxUID || email.uid))
      info(...MAILAPI_TAG, `Updating inbox - scanning ${this.inbox.uidLatest + 1}:${uidNext}`)
      this.syncingInbox = true

      const emails = await this.callIPC(
        this.task_FetchEmails('INBOX', `${this.inbox.uidLatest + 1}:${uidNext}`, false))
      if (!emails || !(emails.reverse)) return error(...MAILAPI_TAG, emails)
      const processed_emails = await MailCleaner.full('INBOX', emails.reverse())

      if (processed_emails.length > 3) {
        new window.Notification(processed_emails.length + ' new emails', {
          body: 'You received ' + processed_emails.length + ' new messages, click here to view them.',
          icon: 'https://helloaiko.com/mail/images/icon-download.png',
          badge: 'https://helloaiko.com/mail/images/icon-download.png',
          timestamp: new Date(),
          tag: 'Aiko Mail'
        })
      } else {
        processed_emails.map(email => {
          new window.Notification(email?.envelope?.from?.[0]?.name || email?.envelope?.from?.[0]?.address, {
            body: email?.envelope?.subject + '\n' + email?.parsed?.text,
            icon: 'https://helloaiko.com/mail/images/icon-download.png',
            badge: 'https://helloaiko.com/mail/images/icon-download.png',
            timestamp: email?.envelope?.date,
            tag: 'Aiko Mail'
          })
        })
      }

      this.inbox.emails.unshift(...processed_emails)
      if (this.inbox.emails.length > 0) { this.inbox.uidLatest = Math.max(...this.inbox.emails.map(email => email.inboxUID || email.uid)) }

      this.syncingInbox = false
      this.memoryLinking()

      await Promise.all(this.boardNames.map(boardName => this.checkBoardForNewMessages(boardName)))
      await this.checkDoneForNewMessages()
    },
    // TODO: probably don't need this
    async checkBoardForNewMessages (boardName) {
      /* FIXME:
        * this should only check for updates in a peeked way for all emails
        * and should only fetch all for latest.
        * most likely there needs to be something to check for updates with peek
      */
      info(...MAILAPI_TAG, 'Checking', boardName, 'for new messages')

      //* Fetch board
      // boardname should be the path!
      const board = this.boards[boardName]
      if (!board) {
        warn('Tried to sync', boardName, 'but the board is not yet created. (will be created)')
        Vue.set(this.boards, boardName, {
          uidLatest: -1,
          emails: [],
          thin: false,
        })
        // start over
        return await this.checkBoardForNewMessages(boardName)
      }

      if (board.emails.filter(e => e.syncing).length > 0) {
        warn('Postponing sync of', boardName, 'until all emails inside of it are synced.')
        return await new Promise((s, _) => {
          setTimeout(async () => {
            s(await app.checkBoardForNewMessages(boardName))
          }, 300)
        })
      }

      //* Indicate that this board is syncing
      Vue.set(this.syncingBoards, boardName, true)

      //* Calculate uidMin
      let uidMin = 1
      const { uidLatest } = board
      if (uidLatest > 0) uidMin = uidLatest + 1
      const {
        uidNext
      } = await this.callIPC(this.task_OpenFolder(boardName))
      if (!uidNext || uidNext.error) return error(...(MAILAPI_TAG), "Didn't get UIDNEXT.")
      if (uidNext - uidMin > 300) {
        warn(...MAILAPI_TAG, 'There are more than 300 new emails in the board. There should be a limit of 200.')
        uidMin = uidNext - 300
      }
      uidMin = Math.max(1, uidMin)

      info(...MAILAPI_TAG, `Updating ${boardName} - scanning ${uidMin}:${uidNext}`)

      //* Fetch the new emails
      const emails = await this.callIPC(
        this.task_FetchEmails(boardName, `${uidMin}:${uidNext}`, peek=false, modseq=null, limit=null,
        downloadAttachments=false, markAsSeen=false, keepCidLinks=false))
      if (!emails || !(emails.reverse)) return error(...MAILAPI_TAG, emails)
      const processed_emails = await MailCleaner.full(boardName, emails.reverse())

      //* Update the board
      this.boards[boardName].emails.unshift(...processed_emails)
      this.boards[boardName].uidLatest = Math.max(0, ...this.boards[boardName].emails.map(email => email.uid))

      //* Maintain memory linking, and turn off syncing
      await this.memoryLinking()
      Vue.set(this.syncingBoards, boardName, false)
    },
    // TODO: probably don't need this
    async checkDoneForNewMessages () {
      info(...MAILAPI_TAG, 'Checking done for new messages')

      //* Indicate that this board is syncing
      const board = this.done
      this.syncingDone = true

      //* Calculate uidMin
      let uidMin = 1
      const { uidLatest } = board
      if (uidLatest > 0) uidMin = uidLatest + 1
      const {
        uidNext
      } = await this.callIPC(this.task_OpenFolder(this.folderNames.done))
      if (!uidNext || uidNext.error) return error(...(MAILAPI_TAG), "Didn't get UIDNEXT.")
      if (uidNext - uidMin > 300) {
        warn(...MAILAPI_TAG, 'There are more than 300 new emails in the done board. There should be a limit of 200.')
        uidMin = uidNext - 300
      }
      uidMin = Math.max(1, uidMin)

      info(...MAILAPI_TAG, `Updating DONE - scanning ${uidMin}:${uidNext}`)

      //* Fetch the new emails
      const emails = await this.callIPC(
        this.task_FetchEmails(this.folderNames.done, `${uidMin}:${uidNext}`, peek=false, modseq=null, limit=null,
        downloadAttachments=false, markAsSeen=false, keepCidLinks=false))
      if (!emails || !(emails.reverse)) return error(...MAILAPI_TAG, emails)
      const processed_emails = await MailCleaner.full(this.folderNames.done, emails.reverse())

      //* Update the board
      this.done.emails.unshift(...processed_emails)
      this.done.uidLatest = Math.max(1, ...this.done.emails.map(email => email.uid))

      //* Maintain memory linking, and turn off syncing
      await this.memoryLinking()
      this.syncingDone = false
    },
    // TODO: probably don't need this
    async checkForUpdates () {
      // const getChanges = async (modseq, folder, uids) => {
      const getChanges = async (folder, uids, all=true) => {
        const changes = {}
        // FIXME: disabled modseq as gmail doesnt support condstore anymore
        // check folder modseq
        // const { highestModseq } = await this.callIPC(this.task_OpenFolder(folder))
        // if (modseq < 0) modseq = highestModseq
        // if the modseq doesnt match something changed
        // if (modseq != highestModseq) {
        // calc min/max, dont reuse bc sanity check
        const uidMax = Math.max(...uids, 1)
        const uidMin = all ? 1 : Math.min(...uids, uidMax)

        if (app.boards[folder]) {
          const board = app.boards[folder]
          if (board.emails.filter(e => e.syncing).length > 0) {
            warn('Postponing getting changes for', boardName, 'until all emails inside of it are synced.')
            return await new Promise((s, _) => {
              setTimeout(async () => {
                s(await getChanges(folder, uids, all))
              }, 300)
            })
          }
        }

        // get changes, only need peek
        const changedEmails = await this.callIPC(
          this.task_FetchEmails(folder,
                            `${uidMin}:${uidMax}`, true
            // modseq
          ))
        // populate changes with uid => flags
        changedEmails.map(e => changes[e.uid] = e.flags)
        // }
        // return {changes, highestModseq}
        return changes
      }

      // check inbox
      const inboxDelta = await getChanges(
        // this.inbox.modSeq,
        this.folderNames.inbox,
        this.inbox.emails.filter(e => e.folder == 'INBOX').map(e => e.inboxUID || e.uid),
        all=false
      )
      // update the inbox
      // this.inbox.modSeq = inboxDelta.highestModseq
      this.inbox.emails = await Promise.all(this.inbox.emails.map(
        async email => {
          // this is here to reset uid if someone deletes it
          if (email.folder == 'INBOX') email.uid = email.inboxUID || email.uid
          if (inboxDelta[email.inboxUID || email.uid]) {
            const flags = inboxDelta[email.inboxUID || email.uid]
            Object.assign(email.flags, flags)
            email.ai.seen = flags.includes('\\Seen')
            email.ai.deleted = flags.includes('\\Deleted')
          } else if (email.folder == 'INBOX') {
            email.ai.deleted = true
          }
          return email
        }
      ))

      // update boards
      for (const board of this.boardNames) {
        if (!this.boards[board]) {
          console.error('Missing definition for', board)
          continue
        }
        // check board
        const boardDelta = await getChanges(
          // this.boards[board].modSeq,
          board,
          this.boards[board].emails.filter(e => !(e.syncFolder && e.syncFolder != board) && e.folder == board).map(e => e.uid)
        )
        // update the board
        // this.boards[board].modSeq = boardDelta.highestModseq
        this.boards[board].emails = (await Promise.all(this.boards[board].emails.map(
          async email => {
            if (boardDelta[email.uid]) {
              const flags = boardDelta[email.uid]
              email.flags = flags
              email.ai.seen = flags.includes('\\Seen')
              email.ai.deleted = flags.includes('\\Deleted')
            } else if (email.folder == board && (!email.syncFolder || email.syncFolder == board)) {
              return null
            }

            // TODO: if the email exists in the delta but doesn't exist locally, then we should fetch it

            return email
          }
        ))).filter(_ => _)
      }

      // update done
      // check inbox
      const doneDelta = await getChanges(
        // this.inbox.modSeq,
        this.folderNames.done,
        this.done.emails.filter(e => !(e.syncFolder && e.syncFolder != '[Aiko Mail]/Done') && e.folder == '[Aiko Mail]/Done').map(e => e.uid),
        all=false
      )
      // update the inbox
      // this.inbox.modSeq = inboxDelta.highestModseq
      this.done.emails = await Promise.all(this.done.emails.map(
        async email => {
          if (doneDelta[email.uid]) {
            const flags = doneDelta[email.uid]
            Object.assign(email.flags, flags)
            email.ai.seen = flags.includes('\\Seen')
            email.ai.deleted = flags.includes('\\Deleted')
          } else if (email.folder == '[Aiko Mail]/Done' && (!email.syncFolder || email.syncFolder == '[Aiko Mail]/Done')) {
            email.ai.deleted = true
          }
          return email
        }
      ))

      this.saveBoardCache()
    },
    // TODO: probably don't need this
    async getOldMessages (n = 400) {
      if (this.inbox.emails.length <= 0) {
        warn(...MAILAPI_TAG, 'There are no emails to begin with, you should call a full sync.')
        return false
      }

      const uidOldest = Math.min(...this.inbox.emails.map(email => email.inboxUID || email.uid))
      if (!uidOldest) return error(...MAILAPI_TAG, "Couldn't identify oldest UID.")
      if (this.inbox.uidOldest < 0) this.inbox.uidOldest = uidOldest
      const uidMax = Math.max(0, Math.min(this.inbox.uidOldest, uidOldest - 1))
      const uidMin = Math.max(0, uidMax - n)

      info(...MAILAPI_TAG, `Seeking history - last ${n} messages (${uidMin}:${uidMax})`)

      const emails = await this.executeIPC(
        this.task_FetchEmails('INBOX', `${uidMin}:${uidMax}`, false))
      if (!emails || !(emails.reverse)) return error(...MAILAPI_TAG, emails)
      const processed_emails = (await MailCleaner.full('INBOX', emails.reverse(), ai = false))
        .map(email => {
          email.parsed.html = ''
          email.parsed.text = ''
          email.parsed.msgText = ''
          email.parsed.headers = {}
          email.parsed.headerLines = []
          return email
        })

      this.inbox.emails.push(...processed_emails)
      this.inbox.uidOldest = uidMin
      this.inbox.emails = this.inbox.emails.sort((e1, e2) => e2.envelope.date - e1.envelope.date)
      await this.halfThreading()
      await this.memoryLinking()
    },
    // TODO: probably don't need this
    async uploadMessage (path, message, headerData, customData) {
      info(...MAILAPI_TAG, 'Uploading a message to', path)
      return error(...MAILAPI_TAG, 'We disabled upload message because it duplicates messages when threading is activated.')

      if (path == 'INBOX') { return window.error(...MAILAPI_TAG, "Don't upload messages to the inbox.") }

      const to_upload = Object.assign({}, message)

      // NOTE: body[] is no longer included
      // you'll need to remove it
      // data is stringified and base64 encoded
      // to parse it you'll have to atob and JSON.parse
      // for attachments you have to add an = after decoding the uint8array before enc
      // for that purpose there is a specific method for dealing with attachments below this one
      to_upload['body[]'] = 'X-Aiko-Mail: ' + btoa(JSON.stringify(headerData)) + '\r\n' + to_upload['body[]']
      const data = btoa(JSON.stringify(customData || {}))

      const boundary = to_upload.bodystructure.parameters.boundary
      const lines = to_upload['body[]'].trim().split('\n')
      const ending = lines.splice(lines.length - 1, 1)[0] + '\n'
      const splitter = ending.split(boundary)[0]
      to_upload['body[]'] = lines.join('\n')
      to_upload['body[]'] += '\r\n\r\n\r\n' + splitter + boundary + '\r\n'
      // use fake ass mimetype to make gmail ignore it
      to_upload['body[]'] += 'Content-Type: aiko/data; charset="UTF-8"\r\n'
      to_upload['body[]'] += 'Content-Transfer-Encoding: quoted-printable\r\n'
      to_upload['body[]'] += '\r\n'
      to_upload['body[]'] += data
      to_upload['body[]'] += '\r\n' + ending

      return await app.callIPC(app.task_UploadEmail(path, to_upload['body[]']))
    },
    parseAikoDataAttachment (att_content) {
      att_content = new Uint8Array(Object.values(att_content))
      const enc = new TextDecoder('utf-8').decode(att_content)
      return JSON.parse(atob(enc + '='))
    },
    // TODO: probably don't need this
    async getThread (email, force=false) {
      // returns thread array for email
      // FIXME: this doesn't completely work
      // FIXME: this might be the single most inefficient routine in the history of computer science
      // and if someone replies to a message that wasn't sent to you
      // then it breaks

      //* if it already has been computed return its thread
      if (email?.parsed?.thread?.messages && !force) return email.parsed.thread

      // NOTE: thread will not include the current message.
      const thread = []

      //* threaded ids is just the id of every message we've already
      const threaded_mids = new Set()

      //* enforce max iterations in case we hit a recursive step
      let iterations = 0
      const MAX_ITER = 50

      //* keep a set of searched subject lines to prevent repetition
      const searched_subjects = new Set()

      //* finds the (partial) thread for a single email
      const get_subthread = async (email, bySubject=false) => {

        //* Target MIDs is a set containing all message ID's we are looking for here
        const target_mids = new Set()
        const inReplyTo = email.envelope?.['in-reply-to']
        if (inReplyTo && !target_mids.has(inReplyTo)) target_mids.add(inReplyTo)
        if (email.parsed?.references?.[0]) {
          //* if references is a string then parse out MIDs
          if (typeof email.parsed.references == "string") {
            email.parsed.references = email.parsed.references.split(/[, \t\r\n]+/gim)
          }
          //* add references to target MIDs
          email.parsed.references.map(reference => target_mids.add(reference))
        }

        //* if we can't find replies via reply ID or reference, we default to subject threading
        const mySubject = email?.ai?.cleanSubject
        const myDate = new Date(email?.envelope?.date)
        const myFolder = email.folder

        //* avoid threading the message into itself
        const myMID = email.envelope['message-id']
        target_mids.delete(myMID)

        //* enforce max iterations so not to crash the app
        if (iterations > MAX_ITER) {
          // we return UID here because it's easier to search by UID than message ID visually (in the DOM)
          warn(...MAILAPI_TAG, 'Reached max iteration count while finding replies for email with UID', email.uid, 'and message ID', myMID)
          return []
        }

        const subthread = [] //* this will contain the subthread of this email
        const subthreaded_ids = new Set() //* keeping track of the current subthread

        //* First, we find replies we have locally in the inbox
        for (let i = 0; i < this.inbox.emails.length; i++) {
          const email = this.inbox.emails[i]
          const mid = email.envelope['message-id']
          const subject = email?.ai?.cleanSubject
          const date = new Date(email?.envelope?.date)

          //* if it is a member of the larger thread already, ignore it
          if (threaded_mids.has(mid)) continue;
          //* if it is a member of the subthread already, ignore it
          if (subthreaded_ids.has(mid)) continue;
          //* if it is the current message, ignore it
          if (myMID == mid) continue;
          //* if it newer than the current message, ignore it
          if (date >= myDate) continue;

          //* if the MID is a target MID, then thread it in
          //* also, if it has the same subject, then thread it in
          if (target_mids.has(mid) || (bySubject && mySubject == subject)) {
            //* set properties indicating who the parent thread is + where the parent is located
            this.inbox.emails[i].ai.threadedBy = myMID
            this.inbox.emails[i].ai.threaded = myFolder || 'NOT_LOCAL'
            //* update the view model
            Vue.set(this.inbox.emails, i, this.inbox.emails[i])
            //* prospectively add it to our subthread
            const add_to_subthread = []
            add_to_subthread.push(email)
            //* if it has its own subthread we will add that to the subthread as well
            if(email.parsed?.thread?.messages?.[0]) add_to_subthread.push(...email.parsed.thread.messages)
            //* commit our additions to the subthread, and keep track of the added MIDs
            add_to_subthread.map(addition => {
              //* we check the subthreaded IDs again here, for two reasons:
              //* 1) if we are running this in parallel we could have a race
              //* 2) it's possible we have dupes b/w our subthread & the email's subthread
              const additionMID = addition.envelope['message-id']
              if (subthreaded_ids.has(additionMID)) return;
              subthreaded_ids.add(additionMID)
              subthread.push(addition)
            })
          }
        }

        //* We're going to repeat the above for each board
        for (const board of this.boardNames) {
          for (let i = 0; i < this.boards[board].emails.length; i++) {
            const email = this.boards[board].emails[i]
            const mid = email.envelope['message-id']
            const subject = email?.ai?.cleanSubject
            const date = new Date(email?.envelope?.date)

            //* if it is a member of the larger thread already, ignore it
            if (threaded_mids.has(mid)) continue;
            //* if it is a member of the subthread already, ignore it
            if (subthreaded_ids.has(mid)) continue;
            //* if it is the current message, ignore it
            if (myMID == mid) continue;
            //* if it newer than the current message, ignore it
            if (date >= myDate) continue;

            //* if the MID is a target MID, then thread it in
            //* also, if it has the same subject, then thread it in
            if (target_mids.has(mid) || (bySubject && mySubject == subject)) {
              //* set properties indicating who the parent thread is + where the parent is located
              this.boards[board].emails[i].ai.threadedBy = myMID
              this.boards[board].emails[i].ai.threaded = myFolder || 'NOT_LOCAL'
              //* update the view model
              Vue.set(this.boards[board].emails, i, this.boards[board].emails[i])
              //* prospectively add it to our subthread
              const add_to_subthread = []
              add_to_subthread.push(email)
              //* if it has its own subthread we will add that to the subthread as well
              if(email.parsed?.thread?.messages?.[0]) add_to_subthread.push(...email.parsed.thread.messages)
              //* commit our additions to the subthread, and keep track of the added MIDs
              add_to_subthread.map(addition => {
                //* we check the subthreaded IDs again here, for two reasons:
                //* 1) if we are running this in parallel we could have a race
                //* 2) it's possible we have dupes b/w our subthread & the email's subthread
                const additionMID = addition.envelope['message-id']
                if (subthreaded_ids.has(additionMID)) return;
                subthreaded_ids.add(additionMID)
                subthread.push(addition)
              })
            }
          }
        }

        //* Repeat for the done board
        for (let i = 0; i < this.done.emails.length; i++) {
          const email = this.done.emails[i]
          const mid = email.envelope['message-id']
          const subject = email?.ai?.cleanSubject
          const date = new Date(email?.envelope?.date)

          //* if it is a member of the larger thread already, ignore it
          if (threaded_mids.has(mid)) continue;
          //* if it is a member of the subthread already, ignore it
          if (subthreaded_ids.has(mid)) continue;
          //* if it is the current message, ignore it
          if (myMID == mid) continue;
          //* if it newer than the current message, ignore it
          if (date >= myDate) continue;

          //* if the MID is a target MID, then thread it in
          //* also, if it has the same subject, then thread it in
          if (target_mids.has(mid) || (bySubject && mySubject == subject)) {
            //* set properties indicating who the parent thread is + where the parent is located
            this.done.emails[i].ai.threadedBy = myMID
            this.done.emails[i].ai.threaded = myFolder || 'NOT_LOCAL'
            //* update the view model
            Vue.set(this.done.emails, i, this.done.emails[i])
            //* prospectively add it to our subthread
            const add_to_subthread = []
            add_to_subthread.push(email)
            //* if it has its own subthread we will add that to the subthread as well
            if(email.parsed?.thread?.messages?.[0]) add_to_subthread.push(...email.parsed.thread.messages)
            //* commit our additions to the subthread, and keep track of the added MIDs
            add_to_subthread.map(addition => {
              //* we check the subthreaded IDs again here, for two reasons:
              //* 1) if we are running this in parallel we could have a race
              //* 2) it's possible we have dupes b/w our subthread & the email's subthread
              const additionMID = addition.envelope['message-id']
              if (subthreaded_ids.has(additionMID)) return;
              subthreaded_ids.add(additionMID)
              subthread.push(addition)
            })
          }
        }

        // TODO: repeat for sent/trash/etc

        //* next we're going to try searching the server
        //* first, let's figure out what MID's we still don't have.
        for (const mid of subthreaded_ids) target_mids.delete(mid)
        //* if there's nothing left we are already done
        if (target_mids.size == 0) return subthread;

        //* search by subject
        const subject_matches = []
        if (this.imapConfig.provider == 'google') {
          if (!searched_subjects.has(email.envelope.subject)) {
            searched_subjects.add(email.envelope.subject)
            subject_matches.push(...(
              (await this.callIPC(
                this.task_SearchEmails(this.folderNames.archive, { header: [ 'subject', email.envelope.subject ] })
              )).map(uid => { return { uid, folder: this.folderNames.archive } })
            ))
          }
          if (mySubject && !searched_subjects.has(mySubject)) {
            searched_subjects.add(mySubject)
            subject_matches.push(...(
              (await this.callIPC(
                this.task_SearchEmails(this.folderNames.archive, { header: [ 'subject', mySubject ] })
              )).map(uid => { return { uid, folder: this.folderNames.archive } })
            ))
          }
        } else {
          if (!searched_subjects.has(email.envelope.subject)) {
            searched_subjects.add(email.envelope.subject)
            subject_matches.push(...(
              (await this.callIPC(
                this.task_SearchEmails(this.folderNames.inbox, { header: [ 'subject', email.envelope.subject ] })
              )).map(uid => { return { uid, folder: this.folderNames.inbox } })
            ))
          }
          if (mySubject && !searched_subjects.has(mySubject)) {
            searched_subjects.add(mySubject)
            subject_matches.push(...(
              (await this.callIPC(
                this.task_SearchEmails(this.folderNames.inbox, { header: [ 'subject', mySubject ] })
              )).map(uid => { return { uid, folder: this.folderNames.inbox } })
            ))
          }
        }
        //* keep track of fetched matches in case we have dupe results
        const fetched_matches = {}
        for (const result of subject_matches) {
          const { uid, folder } = result
          if (!fetched_matches[folder]) fetched_matches[folder] = new Set()
          if (fetched_matches[folder].has(uid)) continue;
          fetched_matches[folder].add(uid)
          //* go ahead and fetch our result
          const email = (await this.callIPC(this.task_FetchEmails(folder, uid, true)))?.[0]
          if (email) {
            const date = new Date(email.envelope.date)
            if (date >= myDate) continue;
            //* Sanity Check: if the gap is > 4 months it's a new email.
            const WEEK = (() => {
              const MS2S = 1000
              const S2MIN = 60
              const MIN2HOUR = 60
              const HOUR2DAY = 24
              const DAY2WEEK = 7
              return MS2S * S2MIN * MIN2HOUR * HOUR2DAY * DAY2WEEK
            })()
            if (Math.abs(date - myDate) > 16*WEEK) continue;
            const mid = email.envelope['message-id']
            if (subthreaded_ids.has(mid)) continue;
            subthreaded_ids.add(mid)
            subthread.push((await MailCleaner.peek(folder, [email]))?.[0])
          } else error(...MAILAPI_TAG,
            "Found the subthread message on the server, but could not fetch it.",
            "\nMessage-ID:", target_mid,
            "\nUID:", uid,
            "\nFolder:", folder
          )
        }

        //* again, let's figure out what MID's we still don't have.
        for (const mid of subthreaded_ids) target_mids.delete(mid)
        //* if there's nothing left we are already done
        if (target_mids.size == 0) return subthread;

        //* search for each target MID on the mailserver
        //* there is unfortunately no way to search en masse :/
        //* we check each folder it could be in, and augment with folder name
        const _this = this // js trixx
        const augmented_search = async (folder, target_mid) =>
          (await _this.callIPC(
            _this.task_SearchEmails(
              folder, { header: [ 'Message-ID', target_mid ] }
            )
        )).map(uid => { return { uid, folder } });

        //* search for remaining target MIDs
        for (const target_mid of target_mids) {

          //* search the archive
          const search_results = await augmented_search(this.folderNames.archive, target_mid)

          //* if the provider is google we don't need to check other folders
          //* also if we have already found it we don't need to check further
          const found = () => search_results.length > 0
          if (this.imapConfig.provider != 'google' && !found()) {
            //* check sent
            search_results.push(...await augmented_search(this.folderNames.sent, target_mid))
            //* no dice? check the remote inbox
            if (!found()) search_results.push(...await augmented_search(this.folderNames.inbox, target_mid))
          }

          if (found()) {
            const { uid, folder } = search_results[0]
            //* go ahead and fetch our result
            const email = (await this.callIPC(this.task_FetchEmails(folder, uid, true)))?.[0]
            if (email) {
              const mid = email.envelope['message-id']
              if (subthreaded_ids.has(mid)) continue;
              subthreaded_ids.add(mid)
              subthread.push((await MailCleaner.peek(folder, [email]))?.[0])
            } else error(...MAILAPI_TAG,
              "Found the subthread message on the server, but could not fetch it.",
              "\nMessage-ID:", target_mid,
              "\nUID:", uid,
              "\nFolder:", folder
            )
          } else warn(...MAILAPI_TAG, //* warning because this happens pretty often, e.g. add-and-replies
            "Could not find subthreaded message on the server.",
            "\nMessage-ID:", target_mid,
            "\nSubject:", mySubject,
            "\nEmail:", email,
          )

        }

        // TODO: do something with the missing MIDs

        return subthread
      }

      //* takes an email and puts its subthread into the thread
      //* recursively calls itself to exhaust the thread
      // NOTE: is a command, not a query!
      const threading = async email => {
        //* increment the iterations
        iterations++
        const subthread = await get_subthread(email, bySubject=true)
        const addition = []
        subthread.map(message => {
          //* if we already have the subthreaded message in our larger thread, ignore it
          const mid = message.envelope['message-id']
          if (threaded_mids.has(mid)) return;
          threaded_mids.add(mid)
          thread.push(message)
          addition.push(message)
        })
        //* NOTE: we do a second loop because if you do it in the first loop,
        //* you may end up searching replies for something already in the subthread
        //* that was simply not added to threaded_ids yet
        //* NOTE: we do this synchronously to avoid the above as well
        for (const message of addition) await threading(message)
      }

      await threading(email)

      //* now, we remove any duplicates from the thread
      const thread_mids = new Set()
      const final_thread = []
      for (const email of thread) {
        if (email.length) return error(...MAILAPI_TAG, 'Array is not fully flattened!')
        //* if we have the MID already it's a dupe
        if (thread_mids.has(email.envelope['message-id'])) continue;
        thread_mids.add(email.envelope['message-id'])
        //* build a minimal version of threaded emails to save space
        const minimal_email = Object.assign({}, email)
        minimal_email.parsed = null
        //* cleanse any deeply nested properties before adding to final thread
        //* we don't do this earlier as there may be a circular structure
        final_thread.push(
          JSON.parse(JSON.stringify(minimal_email))
        )
      }

      //* sort thread by date (descending)
      final_thread.sort((e1, e2) => new Date(e2.envelope.date) - new Date(e1.envelope.date))

      //* we add some metadata to our returned structure :)
      const getSender = email => {
        const name = email?.envelope?.from?.[0]?.name
        if (name) {
          //* if it's comma format, first name is last
          if (name.includes(',')) return name.split(/[, ]+/).last()
          //* otherwise first name is first
          return name.split(/ +/)[0]
        }
        //* if no name, return the email address or just blank for no sender name
        return email?.envelope?.from?.[0]?.address || ''
      }

      return { messages: final_thread, senders: [...new Set(thread.map(getSender))] }
    },
    // TODO: probably don't need this
    async halfThreading () {
      // does the very simple act of:
      // email.ai.isInThread = true
      // on emails that are part of a thread
      // and not the final msg in thread
      // only on emails that we have locally

      // this is ridiculously inefficient lol
      // at best, O(2n+S(2m))
      // at worst, O(2n^2 + S(2m^2))
      // WHERE n = length(inbox)
      //       S = summation of boards
      //       m = length(board)

      // the message ids of messages that were replied to
      // i.e. are part of a thread
      const reply_ids = new Set()
      const reply_id_in = {}

      // thread everything in the inbox
      for (let i = 0; i < this.inbox.emails.length; i++) {
        const email = this.inbox.emails[i]
        const reply_id = email?.envelope?.['in-reply-to']
        if (reply_id && reply_id != email.envelope['message-id']) {
          reply_ids.add(reply_id)
          reply_id_in[reply_id] = 'INBOX'
        }
        if (this.inbox.emails[i].parsed) {
          // if it isn't already threaded
          if (!this.inbox.emails[i]?.ai?.threaded) {
            this.inbox.emails[i].parsed.thread = await this.getThread(this.inbox.emails[i])
          }
        } else {
          error(...MAILAPI_TAG, 'Email does not have body:', this.inbox.emails[i])
        }
        if (this.inbox.emails[i]?.parsed?.thread?.messages?.length > 0) this.inbox.emails[i].ai.thread = true
        else this.inbox.emails[i].ai.thread = false
      }

      // thread everything in boards
      for (const board of this.boardNames) {
        for (let i = 0; i < this.boards[board].emails.length; i++) {
          const email = this.boards[board].emails[i]
          const reply_id = email?.envelope?.['in-reply-to']
          if (reply_id && reply_id != email.envelope['message-id']) {
            reply_ids.add(reply_id)
            reply_id_in[reply_id] = board
          }
          if (this.boards[board].emails[i].parsed) {
            // if it isn't already threaded
            if (!this.boards[board].emails[i]?.ai?.threaded) {
              this.boards[board].emails[i].parsed.thread = await this.getThread(this.boards[board].emails[i])
            }
          } else {
            error(...MAILAPI_TAG, 'Email does not have body:', this.boards[board].emails[i])
          }
          if (this.boards[board].emails[i]?.parsed?.thread?.messages?.length > 0) this.boards[board].emails[i].ai.thread = true
          else this.boards[board].emails[i].ai.thread = false
        }
      }

      // thread everything in done
      for (let i = 0; i < this.done.emails.length; i++) {
        const email = this.done.emails[i]
        const reply_id = email?.envelope?.['in-reply-to']
        if (reply_id && reply_id != email.envelope['message-id']) {
          reply_ids.add(reply_id)
          reply_id_in[reply_id] = '[Aiko Mail]/Done'
        }
        if (this.done.emails[i].parsed) {
          // if it isn't already threaded
          if (!this.done.emails[i]?.ai?.threaded) {
            this.done.emails[i].parsed.thread = await this.getThread(this.done.emails[i])
          }
        } else {
          error(...MAILAPI_TAG, 'Email does not have body:', this.done.emails[i])
        }
        if (this.done.emails[i]?.parsed?.thread?.messages?.length > 0) this.done.emails[i].ai.thread = true
        else this.done.emails[i].ai.thread = false
      }

      // if a message is part of a thread (was replied to by an email we have)
      // => it must have been used in a thread when we called getThread
      // => it is already threaded and we should make sure it's marked as such
      for (let i = 0; i < this.inbox.emails.length; i++) {
        const email = this.inbox.emails[i]
        const msgId = email?.envelope?.['message-id']
        if (msgId && reply_ids.has(msgId)) {
          this.inbox.emails[i].ai.threaded = reply_id_in[msgId] || 'NOT_FOUND'
          Vue.set(this.inbox.emails, i, this.inbox.emails[i])
        }
      }
      for (const boardName of this.boardNames) {
        for (let i = 0; i < this.boards[boardName].emails.length; i++) {
          const email = this.boards[boardName].emails[i]
          const msgId = email?.envelope?.['message-id']
          if (msgId && reply_ids.has(msgId)) {
            this.boards[boardName].emails[i].ai.threaded = reply_id_in[msgId] || 'NOT_FOUND'
            Vue.set(this.boards[boardName].emails, i, this.boards[boardName].emails[i])
          }
        }
      }
      for (let i = 0; i < this.done.emails.length; i++) {
        const email = this.done.emails[i]
        const msgId = email?.envelope?.['message-id']
        if (msgId && reply_ids.has(msgId)) {
          this.done.emails[i].ai.threaded = reply_id_in[msgId] || 'NOT_FOUND'
          Vue.set(this.done.emails, i, this.done.emails[i])
        }
      }

      // trigger UI update
      this.inbox.emails = this.inbox.emails.map(_ => _)
      for (const boardName of this.boardNames) {
        this.boards[boardName].emails = this.boards[boardName].emails.map(_ => _)
      }
      this.done.emails = this.done.emails.map(_ => _)
      // save cache
      this.saveBoardCache()
    },
    // View management
    checkMove ({ to, from, draggedContext }) {
      // prevents moving from&to inbox
      // this is buggy because the vue.draggable lib is trash
      // so we dont use it anymore :/
      /*
            if (to.id == from.id && to.id == "aikomail--inbox") {
                info(...MAILAPI_TAG, "Cancelled move; to id:", to.id, "from id:", from.id)
                return false
            }
            */
      return true
    },
    startMove ({ from, item }) {
      this.dragging = true
      const uid = item.getAttribute('uid')
      let email
      if (from.id == 'aikomail--inbox') {
        for (let i = 0; i < app.inbox.emails.length; i++) {
          if (app.inbox.emails[i].uid == uid) {
            email = app.inbox.emails[i]
            break
          }
        }
      } else if (from.id == 'aikomail--done') {
        for (let i = 0; i < app.done.emails.length; i++) {
          if (app.done.emails[i].uid == uid) {
            email = app.done.emails[i]
            break
          }
        }
      } else {
        const boardName = from.id.substring('aikomail--'.length)
        for (let i = 0; i < app.boards[boardName].emails.length; i++) {
          if (app.boards[boardName].emails[i].uid == uid) {
            email = app.boards[boardName].emails[i]
            break
          }
        }
      }
      // TODO: check done
      if (!email) return error(...MAILAPI_TAG, 'Started dragging an email but we have no way of tracing it? UID lookup failed within local boards, something must be wrong.')
      return (email.dragging = true)
    },
    cloneEmail ({ item, clone }) {
      // you can do mail management on the "original"
      // which is the HTML element for email in `item`
      // and also clone which is the cloned email's
      // corresponding HTML element
      clone.classList.toggle('cloned', true)
    },
    async moveEmail ({ to, from, item, oldIndex, newIndex }) {
      this.dragging = false
      // TODO: calculating index should use message id
      const uid = item.getAttribute('uid')

      // ignore from-to same board
      if (from.id == to.id) {
        item.classList.toggle('cloned', false)
        let email
        if (from.id == 'aikomail--inbox') {
          for (let i = 0; i < app.inbox.emails.length; i++) {
            if (app.inbox.emails[i].uid == uid) {
              email = app.inbox.emails[i]
              break
            }
          }
        } else {
          const boardName = from.id.substring('aikomail--'.length)
          for (let i = 0; i < app.boards[boardName].emails.length; i++) {
            if (app.boards[boardName].emails[i].uid == uid) {
              email = app.boards[boardName].emails[i]
              break
            }
          }
        }
        if (!email) return error(...MAILAPI_TAG, 'Started dragging an email but we have no way of tracing it? UID lookup failed within local boards, something must be wrong.')
        email.dragging = false
        return
      }

      // 2 types of events, to inbox, to board
      // to inbox
      if (to.id == 'aikomail--inbox') {
        let email, index
        for (let i = 0; i < app.inbox.emails.length; i++) {
          if (app.inbox.emails[i].uid == uid) {
            email = app.inbox.emails[i]
            index = i
            break
          }
        }

        // remove to prevent clones
        if (email) {
          app.inbox.emails.splice(index, 1)
        } else {
          const fromBoard = from.id.substring('aikomail--'.length)
          for (let i = 0; i < app.boards[fromBoard].emails.length; i++) {
            if (app.boards[fromBoard].emails[i].uid == uid) {
              email = app.boards[fromBoard].emails[i]
              index = i
              break
            }
          }
          if (!email) return error(...MAILAPI_TAG, "Couldn't find an email with that UID something is super wrong.")
        }

        // if its mid sync use that folder, otherwise its normal folder
        const folder = email.syncFolder || email.folder
        // update UI right away
        email.folder = 'INBOX'
        email.dragging = false

        // if mid sync from inbox, can ignore
        // otherwise just delete the email from its board
        if (folder != 'INBOX') {
          info(...MAILAPI_TAG, 'Deleting email', email.uid, 'from', folder)
          await app.callIPC(app.task_DeleteEmails(
            folder, email.uid
          ))
        }

        email.uid = email.inboxUID || email.uid
        this.recalculateHeight()
      }
      // to board
      else {
        // add to board ids
        // get board name
        const boardName = to.id.substring('aikomail--'.length)
        // could also use:
        // to.parentElement.parentElement.getAttribute('board-name')
        // get email, calculate index ourselves
        let email
        if (boardName == 'done') {
          for (let i = 0; i < app.done.emails.length; i++) {
            if (app.done.emails[i].uid == uid) {
              email = app.done.emails[i]
              break
            }
          }
        } else {
          for (let i = 0; i < app.boards[boardName].emails.length; i++) {
            if (app.boards[boardName].emails[i].uid == uid) {
              email = app.boards[boardName].emails[i]
              break
            }
          }
        }
        if (!email) return error(...MAILAPI_TAG, "Couldn't find an email with that UID in the board.")

        info(...MAILAPI_TAG, 'Dragged', email.uid,
          'of', (email.syncFolder || email.folder),
          'from', from.id, 'to', to.id
        )

        // if this is the first movement of the email
        // since it was last synced to mailserver,
        // set the folder it originated from
        if (!email.syncFolder) email.syncFolder = email.folder
        // update UI right away though!
        if (boardName == 'done') email.folder = this.folderNames.done
        else email.folder = boardName
        email.dragging = false

        // Sync
        // TODO: make hash to signify this sync and store in email
        const targetFolder = email.folder
        const SYNC_TIMEOUT = 1500

        const sync = async (tries=0) => {
          // if it's been picked up, let's wait a bit
          if (email.dragging) {
            window.setTimeout(sync, SYNC_TIMEOUT)
            return warn(...MAILAPI_TAG, 'Postponed move to', targetFolder, 'because the email is currently being dragged.')
          }
          // if it's already syncing, don't race
          if (email.syncing) return error(...MAILAPI_TAG, 'Cancelled move to', targetFolder, 'because it was syncing already.')
          // if the email's folder has changed, don't race
          if (email.folder != targetFolder) return error(...MAILAPI_TAG, 'Cancelled move to', targetFolder, 'because the target folder is', email.folder)
          // if there's no sync folder, there's an issue
          if (!email.syncFolder) return error(...MAILAPI_TAG, "There's no sync folder", email)
          // lock email in UI
          email.syncing = true // TODO: should add a class that exists in draggable filter
          // if it comes from inbox copy,
          // otherwise move it (move it)
          const syncStrategy = (
            (email.syncFolder == 'INBOX')
              ? app.task_CopyEmails : app.task_MoveEmails
          )
          if (email.syncFolder == 'INBOX') email.inboxUID = email.inboxUID || email.uid
          // do the actual copy/move
          const d = await app.executeIPC(syncStrategy(
            email.syncFolder, email.folder,
            email.syncFolder == 'INBOX' ? email.inboxUID : email.uid
          ))

          let destSeqSet = d?.destSeqSet
          if (!destSeqSet && d?.copyuid) destSeqSet = d.copyuid.last()
          if (!destSeqSet && d?.payload?.OK?.[0]?.copyuid?.[2]) destSeqSet = d?.payload?.OK?.[0]?.copyuid?.[2]

          if (!destSeqSet && tries < 3) {
            warn(...MAILAPI_TAG, "Couldn't get destination UID, trying again", d, email)
            email.syncing = false
            sync(tries+1)
          }
          else if (!destSeqSet) {
            error(...MAILAPI_TAG, "Was not able to move the email, moving it back locally.", d, email)
            const fromBoard = from.id.substring('aikomail--'.length)
            email.folder = fromBoard
            let currentIndex = -1
            for (let i = 0; i < app.boards[boardName].emails.length; i++) {
              if (app.boards[boardName].emails[i]?.envelope?.['message-id'] == email?.envelope?.['message-id']) {
                currentIndex = i
                break
              }
            }
            if (currentIndex < 0) {
              return error(...MAILAPI_TAG, "For some reason the email is not currently in the board that it was moved to?")
            }
            app.boards[fromBoard].emails.unshift(...app.boards[boardName].emails.splice(currentIndex, 1))
            return
          }
          info(...MAILAPI_TAG, 'Moved email',
            email.uid, 'from', email.syncFolder,
            'to', targetFolder, 'with new uid',
            destSeqSet
          )

          // make sure we set the current folder/uid pair
          // and this eval is why we check integrity of IPC :)
          email.uid = eval(destSeqSet)
          email.folder = targetFolder
          // clean up post-sync
          email.syncing = false
          email.syncFolder = null
          if (boardName == 'done') {
            if (app.done.emails.length > 0) { app.done.uidLatest = Math.max(...app.done.emails.map(email => email.uid)) }
          } else {
            if (app.boards[boardName].emails.length > 0) { app.boards[boardName].uidLatest = Math.max(...app.boards[boardName].emails.map(email => email.uid)) }
          }
          await BigStorage.store(this.imapConfig.email + '/inbox', {
            uidLatest: this.inbox.uidLatest,
            // modSeq: this.inbox.modSeq,
            emails: this.inbox.emails.slice(0,1000)
          })
          this.saveBoardCache()
          info(...MAILAPI_TAG, 'Saved all caches.')
        }

        setTimeout(() => sync(0), SYNC_TIMEOUT)
      }
      // TODO: special for done? idk
      this.saveBoardCache()
      this.recalculateHeight()
    },
    async reorderBoards () {
      await SmallStorage.store(this.imapConfig.email + ':board-names', this.boardNames)
    },
    async sortEmails(newest=true) {
      info(...MAILAPI_TAG, "Sorting all emails by", newest ? 'newest':'oldest')
      const sorter = newest ?
        ((e1, e2) => new Date(e2.envelope.date) - new Date(e1.envelope.date))
        : ((e1, e2) => new Date(e1.envelope.date) - new Date(e2.envelope.date));
      //this.inbox.emails = this.inbox.emails.sort(sorter)
      for (const board of this.boardNames) {
        this.boards[board].emails = this.boards[board].emails.sort(sorter)
      }
      this.done.emails = this.done.emails.sort(sorter)
      await this.memoryLinking()
    },
    onScroll (e) {
      const { target: { scrollTop, clientHeight, scrollHeight } } = e
      if (scrollTop + clientHeight >= scrollHeight - 1000) {
        if (this.seekingInbox) return
        /*
          TODO: need to figure out some way to handle the user loading over 2k emails
          FIXME: having 5k emails in the view is a good way to burn a GPU !
        */
        if (this.inbox.emails.length > 2000) return;
        info(...MAILAPI_TAG, 'Fetching more messages')
        this.seekingInbox = true
        const that = this
        // TODO: this doesnt exist anymore
        this.getOldMessages().then(() => {
          that.seekingInbox = false
          that.onScroll(e)
        })
      }
      this.recalculateHeight()
    },
    recalculateHeight() {
      /* CONFIG */
      const EMAIL_HEIGHT = 114 // height including padding
      const EMAIL_SPACING = 15 // margin between items
      const TOLERANCE = 10 // # of items above/below rendered additionally
      /* END CONFIG */

      const { scrollHeight, scrollTop, clientHeight } = this.$refs.inboxBoard

      const scrollAmount = scrollTop
      const scrollViewHeight = clientHeight
      const scrollView = {
        min: scrollAmount,
        max: scrollAmount + scrollViewHeight
      }

      const itemHeight = EMAIL_HEIGHT + EMAIL_SPACING
      const listSize = (this.priority ? this.priorityInbox.length : this.otherInbox.length)
      const listHeight = listSize * itemHeight

      const emailsAbove = scrollView.min / itemHeight
      const emailsShown = scrollViewHeight / itemHeight
      const emailsBelow = (listHeight - scrollView.max) / itemHeight

      const indexMin = Math.floor(emailsAbove - TOLERANCE)
      const indexMax = Math.ceil((listSize - emailsBelow) + TOLERANCE)

      if (this.priority) {
        // adjust to priority indices
        if (this.priorityInbox.length > 0) {
          const minEmail = this.priorityInbox?.[indexMin] || this.priorityInbox[0]
          const maxEmail = this.priorityInbox?.[indexMax] || this.priorityInbox.last()
          this.visibleMin = this.inbox.emails.indexOf(minEmail) - TOLERANCE
          this.visibleMax = this.inbox.emails.indexOf(maxEmail) + TOLERANCE
        }
      } else {
        // adjust to other indices
        if (this.otherInbox.length > 0) {
          const minEmail = this.otherInbox?.[indexMin] || this.otherInbox[0]
          const maxEmail = this.otherInbox?.[indexMax] || this.otherInbox.last()
          this.visibleMin = this.inbox.emails.indexOf(minEmail) - TOLERANCE
          this.visibleMax = this.inbox.emails.indexOf(maxEmail) + TOLERANCE
        }
      }
    },
    searchByUID(uid) {
      const results = []
      const check = email => {
        if (email.uid == uid) results.push(email)
        if (email.parsed?.thread?.messages?.length > 0) {
          email.parsed.thread.messages.map(check)
        }
      }
      // check inbox
      this.inbox.emails.map(check)
      for (const board of this.boardNames)
        this.boards[board].emails.map(check)
      this.done.emails.map(check)
      return results
    }
  }
}

window.setInterval(() => {
  app.syncTimeout--
  app.recalculateHeight()
}, 1000)

window.setInterval(async () => {
  app.lastSync = new Date()

  if (app.lastSync - app.lastSuccessfulSync > TIMEOUT * 4) {
    warn(...MAILAPI_TAG, "Artificial time skip (maybe OS sleep?), opening new IPC and IMAP sockets")
    app.syncing = false
    await app.initIPC()
    await app.reconnectToMailServer()
  }

  if (app.imapConfig.provider == 'google') {
    app.google_checkTokens()
  }

  if (!app.connected) {
    app.syncing = false // don't get stuck
    app.reconnectToMailServer() // try a reconnect
    if (TIMEOUT < (300 * 1000)) TIMEOUT *= 2
    app.syncTimeout = TIMEOUT
    return
  }

  TIMEOUT = 30 * SECONDS //* reset timeout if we made it the actual sync
  app.syncTimeout = TIMEOUT
  if (!app.dragging) {
    await app.updateAndFetch()
    app.lastSuccessfulSync = new Date()
  }
}, TIMEOUT)
Notification.requestPermission()

window.onresize = app.recalculateHeight

ipcRenderer.on('connection dropped', () => {
  error(...MAILAPI_TAG, 'IMAP connection was terminated.')
  app.connected = false
  app.reconnectToMailServer()
})