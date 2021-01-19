const MAILAPI_TAG = ['%c[MAIL API]', 'background-color: #ffdddd; color: #000;']

/*
? * TODO: this is what i have left:
* - get emails and display them
* - the movement methods for emails
* - refactoring the view email modal and etc
* - fixing any artifacts in composer
* - the remaining features (search, templates, ai autocomplete)
*/


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
          info(...MAILAPI_TAG, 'Saved all caches.')
        }

        setTimeout(() => sync(0), SYNC_TIMEOUT)
      }
      // TODO: special for done? idk
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