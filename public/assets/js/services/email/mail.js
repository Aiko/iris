const MAILAPI_TAG = ['%c[MAIL API]', 'background-color: #ffdddd; color: #000;']

/*
? * TODO: this is what i have left:
* - get emails and display them (both initially and on sync hooks)
* - refactoring the view email modal and etc
* - fixing any artifacts in composer
* - the remaining features (search, templates, ai autocomplete)
*/

const SyncLock = (() => {
  let _lock = {
    holder: null,
    lock: (async () => null)()
  }

  //? generate a unique ID
  //? puts it into waiting if the lock is owned
  //? otherwise, own the lock
  const waiting = []
  const ID = () => {
    const id = String.random(12).toString('hex')
    if (waiting.includes(id)) return ID()
    if (_lock.holder) waiting.push(id)
    else _lock.holder = id
    return id
  }

  const syncOK = () => new Promise((s, _) => {
    const helper = () => {
      if (app.movers.size > 0 || app.syncing) {
        setTimeout(helper, 50) //? wait 50ms, then try again
      }
      else {
        s()
      }
    }
    helper()
  })

  return {
    //? use this to lock sync on shared resources
    //? it'll wait for anything currently holding it before grabbing the lock
    acquire: () => new Promise(async (s, _) => {
      const id = ID()
      while (_lock.holder != id) await _lock.lock;
      _lock.lock = new Promise(async (s2, _) => {
        //? wait for sync to be OK
        await syncOK()
        //? then, give the acquirer the lock
        const release = () => {
          //? then, get a new holder
          if (waiting.length > 0) _lock.holder = waiting.shift()
          //? if nothing is waiting just empty the lock
          else _lock.holder = null
          //? release the lock
          s2()
        }
        s(release)
      })
      await _lock.lock;
    }),
    peek: () => _lock.holder,
    length: () => waiting.length
  }
})

const mailapi = {
  data: {
    //? the engine model
    engine: null,
    //? metadata and configurations for the IMAP client
    imapConfig: {
      email: '',
      host: '',
      port: 993,
      user: '',
      pass: '',
      oauth: '',
      secure: true,
      provider: 'other'
    },
    //? manages mailboxes loaded into Aiko Mail
    mailboxes: [],
    currentMailbox: '',
    avatar: 'assets/icons/avatar.png',
    //? synced folders object
    folders: {},
    //? internal representation of threads
    threads: {}, //* tids[tid] = thread
    inbox: [], //* [tid]
    special: {
      sent: [], //* [tid]
      spam: [], //* [tid]
      drafts: [], //* [tid]
      trash: [], //* [tid]
      archive: [] //* [tid]
    },
    boardOrder: [], //* [slug]
    boardThiccness: [], //* [slug]
    boards: [], //* { ...board metadata, tids: [tid] }
    //? some state/ui management
    syncLock: SyncLock(),
    backendSyncing: false,
    syncing: false,
    seekingInbox: false,
    reachedEndOfInbox: false,
    movers: new Set(),
    dragging: false,
    visibleMin: 0,
    visibleMax: 500,
    priority: true,
    seenFilter: null,
    //? smaller lists for priority and other to optimize the UI
    priorityInbox: [],
    otherInbox: [],
    //? regular view list
    fullInbox: [],
    priorityFullInbox: [],
    otherFullInbox: [],
  },
  watch: {
    'inbox': async function (_) {
      const priorityInbox = []
      const otherInbox = []

      this.resolveThreads(this.inbox).filter(_ => _).map(({ tid, priority }) => {
        if (priority) priorityInbox.push(tid)
        else otherInbox.push(tid)
      })

      this.priorityInbox = priorityInbox
      this.otherInbox = otherInbox

      this.recalculateHeight()
    },
    'fullInbox': async function (_) {
      const priorityInbox = []
      const otherInbox = []

      this.resolveThreads(this.fullInbox).filter(_ => _).map(({ tid, priority }) => {
        if (priority) priorityInbox.push(tid)
        else otherInbox.push(tid)
      })

      this.priorityFullInbox = priorityInbox
      this.otherFullInbox = otherInbox

      this.recalculateHeight()
    },
    priority() {
      this.recalculateHeight()
      //! TODO: fix this
      /*
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
      */
    }
  },
  computed: {
    smartUnread() {
      return Object.values(this.threads).filter(thread =>
        thread.allFolders.includes("INBOX") &&
        this.inbox.includes(thread.tid) && //? is actually in the inbox
        !(thread.emails?.[0]?.M?.flags.seen) && //? has to be unread
        (thread.priority) && //? priority check
        (thread.emails?.[0]?.M?.envelope.date.addDays(-40)) //? within last month
      ).length
    },
    smartPriorityUnread() {
      return Object.values(this.threads).filter(thread =>
        thread.folder == "INBOX" &&
        this.inbox.includes(thread.tid) && //? is actually in the inbox
        !(thread.emails?.[0]?.M?.flags.seen) && //? has to be unread
        (thread.priority) && //? priority check
        (thread.emails?.[0]?.M?.envelope.date.addDays(-40)) //? within last month
      ).length
    },
    spamUnread() {
      return Object.values(this.threads).filter(thread =>
        thread.allFolders?.includes(this.folders.spam) &&
        !(thread.emails?.[0]?.M?.flags.seen) //? has to be unread
      ).length
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
    task_GetEngine (config, force=false) {
      return this.ipcTask('please get or start the corresponding engine', {config, force})
    },
    task_RestartEngine (config) {
      return this.ipcTask('please update engine config', {config,})
    },
    task_TestEngine (config) {
      return this.ipcTask('please test a connection', {config,})
    },
    task_DownloadAttachment (attachment) {
      return this.ipcTask('please download an attachment', attachment)
    },
    task_PreviewAttachment (attachment) {
      return this.ipcTask('please preview an attachment', attachment)
    },
    ////////////////////////////////////////////!
    //! IMAP Configuration & Initialization
    ////////////////////////////////////////////!
    //? Selects the last opened mailbox (or forces an addition)
    //? Loads IMAP configuration
    //? Loads OAuth configuration & checks tokens
    async initIMAP () {

      info(...MAILAPI_TAG, 'Loading address cache...')
      this.mailboxes = (await Satellite.load('mailboxes')) || []

      //? determine what to use as our opened mailbox or force addition otherwise
      info(...MAILAPI_TAG, 'Loading previously selected mailbox')
      let currentEmail = await Satellite.load('current-mailbox')
      if (!currentEmail) {
        warn(...MAILAPI_TAG, 'There is no current email.')
        if (this.mailboxes.filter(_ => _).length > 0) {
          info(...MAILAPI_TAG, 'Selected first mailbox as current email.')
          currentEmail = this.mailboxes.filter(_ => _)[0]
        } else {
          error(...MAILAPI_TAG, 'There are no mailboxes. Forcing a mailbox addition.')
          this.flow.forceAddMailbox = true
          return
        }
      }

      //? set the current mailbox
      this.currentMailbox = currentEmail
      this.avatar = await this.currentMailbox.getAvatar({ colorPalette: app.colorPalette })
      if (this.avatar == "assets/icons/avatar.png") {
        this.avatar = this.resolveIcon('assets/icons/avatar.png')
      }

      //? load the relevant IMAP configuration
      info(...MAILAPI_TAG, 'Loading IMAP config...')
      await this.loadIMAPConfig(currentEmail)

      //? if it isn't correct then force a mailbox addition
      if (!this.imapConfig.email) {
        error(...MAILAPI_TAG, 'Was unable to load IMAP config. Most likely a Time Machine Effect.')
        this.flow.forceAddMailbox = true
        return
      }

      //? load and check OAuth tokens
      await this.loadOAuthConfig()
      await this.checkOAuthTokens()
    },
    //? Saves the IMAP configuration to persistent cache
    async saveIMAPConfig () {
      //? Migration
      if (this.imapConfig.xoauth2 && !(this.imapConfig.oauth)) {
        this.imapConfig = {
          email: this.imapConfig.email,
          host: this.imapConfig.host,
          port: 993,
          user: this.imapConfig.user,
          pass: this.imapConfig.pass,
          oauth: this.imapConfig.xoauth2,
          secure: this.imapConfig.secure,
          provider: this.imapConfig.provider
        }
      }
      await Satellite.store(this.imapConfig.email + '/imap-config', this.imapConfig)
    },
    //? Loads the IMAP configuration for an email from persistent cache
    async loadIMAPConfig (email) {
      this.imapConfig = await Satellite.load(email + '/imap-config')
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
      * this should happen on the electron backend
      * that way, trying to make an engine for an email address that exists
      * will allow us to delete the existing one (as a Mouseion thread)
    */
    async getEngine(force=false) {
      //? start new Mouseion instance, get port
      //? if the engine exists, shut it down
      const port = await this.callIPC(this.task_GetEngine(this.imapConfig, force=force))
      info(...MAILAPI_TAG, 'Started a new engine on port', port)

      //? set engine and initialize it
      this.engine = Engine(port)
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
        await Satellite.store('mailboxes', this.mailboxes)
      }

      //? set it as the current mailbox
      this.currentMailbox = this.imapConfig.email
      this.avatar = await this.currentMailbox.getAvatar({ colorPalette: app.colorPalette })
      if (this.avatar == "assets/icons/avatar.png") {
        this.avatar = this.resolveIcon('assets/icons/avatar.png')
      }
      await Satellite.store('current-mailbox', this.imapConfig.email)

      //? save IMAP/SMTP configurations as an extra measure
      //? in case this is being called on a new mailserver
      await this.saveIMAPConfig()
      if (this.saveSMTPConfig) await this.saveSMTPConfig()

      //? load & check OAuth tokens
      await this.loadOAuthConfig()
      await this.checkOAuthTokens()

      info(...MAILAPI_TAG, "Testing connection...")
      const testConnection = await this.ipcTask('please test a connection', {
        ...this.imapConfig
      })
      const { valid, error } = await this.callIPC(testConnection).catch(_ => _)
      info(...MAILAPI_TAG, "Validity:", valid, "Error:", error)

      //? (re)start the engine
      await this.getEngine()
      info(...MAILAPI_TAG, "Received engine instance")

      //? bind engine listeners
      this.engine.on('sync-started', () => {
        app.backendSyncing = true
      })
      this.engine.on('sync-finished', this.syncOp)
      this.engine.on('auth-failed', this.forceOAuthRefresh)
      info(...MAILAPI_TAG, "Registered Listeners")

      //? reset the UI
      this.inbox = []
      this.special.sent = []
      this.special.drafts = []
      this.special.trash = []
      this.special.spam = []
      this.special.archive = []
      this.boards = []
      info(...MAILAPI_TAG, "Reset UI")

      //? create local boards
      this.folders = await this.engine.folders.state()
      info(...MAILAPI_TAG, "Synced direct folder state:", this.folders)
      const boards = await this.engine.folders.boards()
      info(...MAILAPI_TAG, "Fetched boards:", boards)
      boards.names.map(slug => {
        const path = boards.paths[slug]
        this.boards.push({
          name: slug,
          thin: false,
          path,
          tids: []
        })
      })

      //? restore thinness to boards
      this.boardThiccness = await Satellite.load(this.imapConfig.email + ':board-thiccness') || []
      this.boardThiccness.map(slug => {
        const board = this.boards.filter(({ name }) => name == slug)?.[0]
        if (!board) return warn(...MAILAPI_TAG, "The", slug, "board no longer exists and will be removed from board order.")
        const i = this.boards.indexOf(board)
        this.boards[i].thin = true
      })
      info(...MAILAPI_TAG, "Computed Board Thiccness.")

      //? sort the local boards
      this.boardOrder = await Satellite.load(this.imapConfig.email + ':board-order') || []
      const tmp_boards = JSON.parse(JSON.stringify(this.boards))
      const tmp2_boards = []
      this.boardOrder.map(slug => {
        const board = tmp_boards.filter(({ name }) => name == slug)?.[0]
        if (!board) return warn(...MAILAPI_TAG, "The", slug, "board no longer exists and will be removed from board order.")
        const i = tmp_boards.indexOf(board)
        tmp2_boards.push(...(tmp_boards.splice(i, 1)))
      })
      tmp2_boards.push(...tmp_boards)
      Vue.set(this, 'boards', tmp2_boards)
      this.boardOrder = this.boards.map(({ name }) => name)
      await Satellite.store(this.imapConfig.email + ':board-order', this.boardOrder)
      info(...MAILAPI_TAG, "Sorted local boards.")

      //? sync client
      // info(...MAILAPI_TAG, "Performing client sync.")
      // await this.syncOp()
      //! experimental: instead, pop cache
      this.threads = await Satellite.load(this.currentMailbox + "threads") || {}
      this.boards.map(async (board, i) => {
        this.boards[i].tids = ((await Satellite.load(this.currentMailbox + "emails/" + board.name)) || [])
      })
      this.inbox = await Satellite.load(this.currentMailbox + "emails/inbox") || []
      this.fullInbox = await Satellite.load(this.currentMailbox + "emails/fullInbox") || []
      Vue.set(this, 'special',
        await Satellite.load(this.currentMailbox + "emails/special") || this.special)
      ;

      if (controlsLoader && this.inbox.length > 0) this.loading = false

      //? save IMAP configuration again as an extra measure (in case the OAuth tokens updated)
      info(...MAILAPI_TAG, 'Saving config...')
      await this.saveIMAPConfig()

      //? set the new title
      document.title = `Inbox - ${this.currentMailbox}`

      //? start your engines!
      await DwarfStar.sync()
      this.firstTime = DwarfStar.settings().meta.firstTime
      info(...MAILAPI_TAG, "Starting engine sync.")
      await this.engine.sync.immediate()
      if (controlsLoader && !this.flow.addingMailbox) this.loading = false
      if (this.firstTime) {
        info(...(this.TAG), "This is the user's first open of the app. Running tour...")
        this.tour = runTour()
        await DwarfStar.save({meta: {firstTime: false}})
      }
    },
    //? Reconnects to connected mailserver
    //! NOTE: this assumes the mailserver is currently loaded
    //! DO NOT use this in place of switchMailServer
    //! A mailbox loaded via switchMailServer can be reconnected to using this
    //! Really, don't use this for anything other than auth changes & errors
    //! Again please note this is NOT the same as the old reconnectToMailServer from Iris2
    async reconnectToMailServer() {
      info(...MAILAPI_TAG, "Reconnecting to mail server...")

      await this.callIPC(this.task_RestartEngine(this.imapConfig))
    },
    ////////////////////////////////////////////!
    //! Utility Methods
    ////////////////////////////////////////////!
    //? turn a slug into a folder path
    folderWithSlug (slug) {
      if (!slug) {
        warn(...MAILAPI_TAG, 'Board slug is empty, defaulting to Uncategorized')
        slug = 'Uncategorized'
      }
      return `[Aiko]/${slug}`
    },
    //? resolve a single board from slug
    resolveBoard (slug) {
      return this.boards.filter(({ name }) => name == slug)?.[0]
    },
    //? resolve a tid to a thread
    resolveThread (tid) {
      return this.threads[tid]
    },
    //? resolve many tids to many threads
    resolveThreads (tids) {
      return tids.map(this.resolveThread)
    },
    //? process a thread and save it locally with added UI variables
    saveThread (thread, reset=true) {
      thread.date = new Date(thread.date)
      thread.emails = thread.emails.map(email => {
        email.M.envelope.date = new Date(email.M.envelope.date)
        return email
      })
      if (reset) {
        thread.dragging = false
        thread.syncing = false
        thread.originFolder = thread.folder
        //? compute priority
        thread.priority = (() => {
          for (const email of thread.emails) {
            if (email.M.priority) return true
          }
          return false
        })()
        //? compute seen, bcced and starred as the status of the latest message
        thread.seen = thread.emails?.[0]?.M?.flags?.seen
        thread.starred = thread.emails?.[0]?.M?.flags?.starred
        thread.bcced = thread.emails?.[0]?.M?.envelope?.bcc?.length > 0
        //? compute badges
        thread.hasAttachments = (() => {
          for (const email of thread.emails) {
            if (email.parsed?.attachments?.length > 0) return true
          }
          return false
        })()
        thread.hasTrackers = (() => {
          for (const email of thread.emails) {
            if (email.M.tracker) return true
          }
          return false
        })()
        //? compute participants
        const participantAddresses = new Set()
        thread.participants = thread.emails.map(email => {
          const people = []
          people.push(email.M.envelope.from)
          people.push(...(email.M.envelope.cc))
          people.push(...(email.M.envelope.bcc))
          people.push(...(email.M.envelope.to))
          //? we try to detect a forwarding address
          const forwardAddress = (() => {
            //? if we weren't the sender
            if (email.M.envelope.from.address == this.currentMailbox) return null;
            //? ok but if we were the sender
            if (email.locations.filter(({ folder }) => folder == this.folders.sent).length > 0) return email.M.envelope.from.address
            //? if we weren't a "to" recipient
            const recipients = email.M.envelope.to.map(({ address }) => address)
            if (recipients.includes(this.currentMailbox)) return null;
            //? and if we weren't cc'ed or bcc'ed
            const cced = email.M.envelope.cc.map(({ address }) => address)
            if (cced.includes(this.currentMailbox)) return null;
            const bcced = email.M.envelope.bcc.map(({ address }) => address)
            if (bcced.includes(this.currentMailbox)) return null;
            //? check for the received header
            if (!email.parsed.headerLines) return null;
            const received = (() => {
              const r = email.parsed.headerLines.filter(({key}) => key.toLowerCase() == "received")
              if (!r) return null;
              return r.map(({ line }) => line).join('\n')
            })()
            if (!received) return null;
            //? check if any of the above recipients are in the received
            for (const address of recipients) {
              if (received.includes(address))
                return address;
            }
            for (const address of cced) {
              if (received.includes(address))
                return address;
            }
            for (const address of bcced) {
              if (received.includes(address))
                return address;
            }
            return null;
          })();;
          const others = people.filter(({ address }) =>
            (address != this.currentMailbox) &&
            (address != forwardAddress) &&
            !(participantAddresses.has(address))
          )
          others.map(({ address }) => participantAddresses.add(address))
          return others
        }).flat()
      }
      //? next, update the threads global object so any UI updates can resolve
      Vue.set(this.threads, thread.tid, thread)
      return thread
    },
    //? find the representative location of a thread (location of newest email of thread in its originFolder)
    locThread ({ emails, originFolder }) {
      for (const email of emails) {
        const { locations } = email
        const afLoc = locations.filter(({ folder }) => folder == originFolder)?.[0]
        if (afLoc) return afLoc
      }
      return null
    },
    ////////////////////////////////////////////!
    //! Board Methods
    ////////////////////////////////////////////!
    async boardCreate (slug) {
      if (!slug) {
        warn(...MAILAPI_TAG, 'Board slug is empty, defaulting to Uncategorized')
        slug = 'Uncategorized'
      }
      const path = this.folderWithSlug(slug)
      //? check if it already exists, we get the folder via WS to be 100% up to date
      const boards = await this.engine.folders.boards()
      if (boards.names.includes(slug)) return error(...MAILAPI_TAG, "Tried to create board with slug", slug, "but it already exists!")
      ;;await this.engine.folders.add(path)
      //? confirm it was added
      const updatedBoards = await this.engine.folders.boards()
      if (!(updatedBoards.names.includes(slug))) return error(...MAILAPI_TAG, "Tried to create board with slug", slug, "but failed to create the matching folder.")
      //? add that to the sync set
      await this.engine.sync.add(path)
      //? conformity is key
      this.boardOrder = this.boards.map(({ name }) => name).sort((a, b) =>
        this.boardOrder.indexOf(a) - this.boardOrder.indexOf(b))
      //? create a UI element for it
      this.boards.push({
        name: slug,
        thin: false,
        path,
        tids: []
      })
      this.boardOrder.push(slug)

      await Satellite.store(this.imapConfig.email + ':board-order', this.boardOrder)
    },
    ////////////////////////////////////////////!
    //! Syncing with Backend
    ////////////////////////////////////////////!
    async syncOp () {
      const release = await this.syncLock.acquire()
      this.backendSyncing = false
      this.syncing = true
      info(...MAILAPI_TAG, "SYNC OP - START")

      const okayletsgo = new Audio('./assets/videos/sync.mp3')
      // okayletsgo.play()

      //? update folders
      this.folders = await this.engine.folders.state()
      const boards = await this.engine.folders.boards()
      //? if a board no longer exists, delete it
      for (let i = 0; i < this.boards.length;) {
        const { name } = this.boards[i]
        if (!(boards.names.includes(name))) {
          this.boards.splice(i, 1)
        } else i++;
      }
      //? locally adds new boards
      boards.names.map(slug => {
        const local_board = this.boards.filter(({ name }) => name == slug)?.[0]
        if (local_board) return;
        //? if it doesn't exist locally we need to create the UI element for it
        this.boards.push({
          name: slug,
          thin: false,
          path: boards.paths[slug],
          tids: []
        })

        this.boardOrder = this.boards.map(({ name }) => name).sort((a, b) =>
          this.boardOrder.indexOf(a) - this.boardOrder.indexOf(b))
      })
      await Satellite.store(this.imapConfig.email + ':board-order', this.boardOrder)
      info(...MAILAPI_TAG, "SYNC OP - synced board metadata")
      let t0 = performance.now()

      //? compute local cursor
      const cursors = Object.values(this.threads).map(({ cursor }) => cursor)
      const cursor = Math.max(...cursors, -1)

      //? fetch updates to inbox
      const max_inbox_updates = Math.max(50, this.inbox.length)
      const inbox_updates = await this.engine.resolve.threads.latest(this.folders.special.inbox, cursor, {limit: max_inbox_updates})
      //? apply updates to inbox
      if (!inbox_updates) {
        this.syncing = false
        release()
        return error(...MAILAPI_TAG, "SYNCOP - no updates received to inbox.")
      }
      info(...MAILAPI_TAG, "SYNC OP - fetched updates for inbox:", performance.now() - t0)
      t0 = performance.now()
      const { all, updated } = inbox_updates
      //? first, anything that is no longer in exists can be dumped
      const existsTIDs = all.map(({ tid }) => tid)
      this.inbox = this.inbox.filter(tid => existsTIDs.includes(tid))
      //? next, process the threads
      updated.map(thread => {
        thread = this.saveThread(thread)
        //? first, determine if we have it locally
        const local = this.inbox.includes(thread.tid)
        //? since we resolve directly, this should update existing emails without us having to
        //! if you want to force a UI change, can do a stringify-parse set on the tids
        //? if we don't have it, we need to add it
        if (!local) this.inbox.unshift(thread.tid) //* unshift because it is in ascending date order
      })
      //? sort the inbox to maintain date invariant
      this.inbox.sort((a, b) => this.resolveThread(b).date - this.resolveThread(a).date)
      success(...MAILAPI_TAG, "SYNC OP - synced inbox state:", performance.now() - t0)

      //? fetch updates to boards
      await Promise.all(this.boards.map(async ({ path, tids }, i) => {
        const max_board_updates = Math.max(1000, tids.length)
        const board_updates = await this.engine.resolve.threads.latest(path, cursor, {limit: max_board_updates})
        //? apply updates to board
        const { all, updated } = board_updates
        //? first, anything that is no longer in exists can be dumped
        const existsTIDs = all.map(({ tid }) => tid)
        this.boards[i].tids = this.boards[i].tids.filter(tid => existsTIDs.includes(tid))
        //? next, process the threads
        updated.map(thread => {
          thread = this.saveThread(thread)
          //? first, determine if we have it locally
          const local = tids.includes(thread.tid)
          //? since we resolve directly, this should update existing emails without us having to
          //! if you want to force a UI change, can do a stringify-parse set on the tids
          //? if we don't have it, we need to add it
          if (!local) this.boards[i].tids.unshift(thread.tid) //* unshift because it is in ascending date order
        })
        this.boards[i].tids.sort((a, b) => this.resolveThread(b).date - this.resolveThread(a).date)
      }))

      //? fetch updates to special folders
      ;await (async (cursor) => {
        const max_sent_updates = Math.max(500, this.special.sent.length)
        const max_spam_updates = Math.max(500, this.special.spam.length)
        const max_drafts_updates = Math.max(500, this.special.drafts.length)
        const max_trash_updates = Math.max(500, this.special.trash.length)
        const max_archive_updates = Math.max(500, this.special.archive.length)
        const sent_updates = await this.engine.resolve.threads.latest(this.folders.special.sent, cursor, {limit: max_sent_updates, loose: true})
        const spam_updates = await this.engine.resolve.threads.latest(this.folders.special.spam, cursor, {limit: max_spam_updates, loose: true})
        const drafts_updates = await this.engine.resolve.threads.latest(this.folders.special.drafts, cursor, {limit: max_drafts_updates, loose: true})
        const trash_updates = await this.engine.resolve.threads.latest(this.folders.special.trash, cursor, {limit: max_trash_updates, loose: true})
        const archive_updates = await this.engine.resolve.threads.latest(this.folders.special.archive, cursor, {limit: max_archive_updates, loose: true})
        //? apply updates to special folders
        const sent_all = sent_updates?.all ?? []
        const sent_updated = sent_updates?.updated ?? []
        const spam_all = spam_updates?.all ?? []
        const spam_updated = spam_updates?.updated ?? []
        const drafts_all = drafts_updates?.all ?? []
        const drafts_updated = drafts_updates?.updated ?? []
        const trash_all = trash_updates?.all ?? []
        const trash_updated = trash_updates?.updated ?? []
        const archive_all = archive_updates?.all ?? []
        const archive_updated = archive_updates?.updated ?? []
        //? first, anything that is no longer in exists can be dumped
        const sentExistsTIDs = sent_all.map(({ tid }) => tid)
        const spamExistsTIDs = spam_all.map(({ tid }) => tid)
        const draftsExistsTIDs = drafts_all.map(({ tid }) => tid)
        const trashExistsTIDs = trash_all.map(({ tid }) => tid)
        const archiveExistsTIDs = archive_all.map(({ tid }) => tid)
        this.special.sent = this.special.sent.filter(tid => sentExistsTIDs.includes(tid))
        this.special.spam = this.special.spam.filter(tid => spamExistsTIDs.includes(tid))
        this.special.drafts = this.special.drafts.filter(tid => draftsExistsTIDs.includes(tid))
        this.special.trash = this.special.trash.filter(tid => trashExistsTIDs.includes(tid))
        this.special.archive = this.special.archive.filter(tid => archiveExistsTIDs.includes(tid))
        //? next, process the threads
        sent_updated.map(thread => {
          thread = this.saveThread(thread)
          //? first, determine if we have it locally
          const local = this.special.sent.includes(thread.tid)
          //? since we resolve directly, this should update existing emails without us having to
          //! if you want to force a UI change, can do a stringify-parse set on the tids
          //? if we don't have it, we need to add it
          if (!local) this.special.sent.unshift(thread.tid) //* unshift because it is in ascending date order
        })
        spam_updated.map(thread => {
          thread = this.saveThread(thread)
          //? first, determine if we have it locally
          const local = this.special.spam.includes(thread.tid)
          //? since we resolve directly, this should update existing emails without us having to
          //! if you want to force a UI change, can do a stringify-parse set on the tids
          //? if we don't have it, we need to add it
          if (!local) this.special.spam.unshift(thread.tid) //* unshift because it is in ascending date order
        })
        drafts_updated.map(thread => {
          thread = this.saveThread(thread)
          //? first, determine if we have it locally
          const local = this.special.drafts.includes(thread.tid)
          //? since we resolve directly, this should update existing emails without us having to
          //! if you want to force a UI change, can do a stringify-parse set on the tids
          //? if we don't have it, we need to add it
          if (!local) this.special.drafts.unshift(thread.tid) //* unshift because it is in ascending date order
        })
        trash_updated.map(thread => {
          thread = this.saveThread(thread)
          //? first, determine if we have it locally
          const local = this.special.trash.includes(thread.tid)
          //? since we resolve directly, this should update existing emails without us having to
          //! if you want to force a UI change, can do a stringify-parse set on the tids
          //? if we don't have it, we need to add it
          if (!local) this.special.trash.unshift(thread.tid) //* unshift because it is in ascending date order
        })
        archive_updated.map(thread => {
          thread = this.saveThread(thread)
          //? first, determine if we have it locally
          const local = this.special.archive.includes(thread.tid)
          //? since we resolve directly, this should update existing emails without us having to
          //! if you want to force a UI change, can do a stringify-parse set on the tids
          //? if we don't have it, we need to add it
          if (!local) this.special.archive.unshift(thread.tid) //* unshift because it is in ascending date order
        })
        //? sort the special folders
        this.special.sent.sort((a, b) => this.resolveThread(b).date - this.resolveThread(a).date)
        this.special.spam.sort((a, b) => this.resolveThread(b).date - this.resolveThread(a).date)
        this.special.drafts.sort((a, b) => this.resolveThread(b).date - this.resolveThread(a).date)
        this.special.trash.sort((a, b) => this.resolveThread(b).date - this.resolveThread(a).date)
        this.special.archive.sort((a, b) => this.resolveThread(b).date - this.resolveThread(a).date)
      })(cursor);

      t0 = performance.now()
      info(...MAILAPI_TAG, "SYNC OP - computing full inbox")
      //? make the fullInbox
      this.fullInbox = (that => {
        const s = []
        s.push(...that.inbox)
        that.boards.map(({ tids }) => s.push(...tids))
        const ms = new Set(s)
        const os = [...ms]
        os.sort((a, b) => this.resolveThread(b).date - this.resolveThread(a).date)
        return os
      })(this)
      success(...MAILAPI_TAG, "SYNC OP - computed full inbox:", performance.now() - t0)

      //? Cache
      this.boards.map(board => Satellite.store(this.currentMailbox + "emails/" + board.name, board.tids))
      Satellite.store(this.currentMailbox + "emails/inbox", this.inbox)
      Satellite.store(this.currentMailbox + "emails/fullInbox", this.fullInbox)
      Satellite.store(this.currentMailbox + "threads", this.threads)
      Satellite.store(this.currentMailbox + "emails/special", this.special)

      this.syncing = false
      if (this.flow.addingMailbox) {
        this.flow.addingMailbox = false
        if (this.loading) this.loading = false
      }
      release()
    },
    async syncOldOp () {
      const release = await this.syncLock.acquire()
      this.backendSyncing = false
      this.syncing = true
      info(...MAILAPI_TAG, "SYNC OLD OP - START")

      let t0 = performance.now()

      //? fetch updates to inbox
      const threads = this.inbox
      const inbox_old = await this.engine.resolve.threads.latest(this.folders.special.inbox, -1, {
        limit: 200,
        start: threads.length
      })
      //? apply updates to inbox
      if (!inbox_old) {
        this.syncing = false
        release()
        return error(...MAILAPI_TAG, "SYNC OLD OP - no older emails received for inbox.")
      }
      info(...MAILAPI_TAG, "SYNC OLD OP - fetched older emails for inbox:", performance.now() - t0)
      t0 = performance.now()
      const { updated } = inbox_old
      info(...MAILAPI_TAG, "SYNC OLD OP - ", updated.length, "old emails fetched")
      //? first, anything that already exists can be dumped
      const filtered = updated.filter(tid => !threads.includes(tid))

      if (filtered.length == 0) {
        this.syncing = false
        this.reachedEndOfInbox = true
        release()
        return success(...MAILAPI_TAG, "SYNC OLD OP - no older emails left in inbox.")
      }

      //? next, process the threads
      filtered.map(thread => {
        thread = this.saveThread(thread)
        //! if you want to force a UI change, can do a stringify-parse set on the tids
        this.inbox.push(thread.tid) //* push because it is in ascending date order
      })
      //? sort the inbox to maintain date invariant
      this.inbox.sort((a, b) => this.resolveThread(b).date - this.resolveThread(a).date)
      success(...MAILAPI_TAG, "SYNC OLD OP - synced old emails for inbox:", performance.now() - t0)


      t0 = performance.now()
      info(...MAILAPI_TAG, "SYNC OLD OP - computing full inbox")
      //? make the fullInbox
      this.fullInbox = (that => {
        const s = []
        s.push(...that.inbox)
        that.boards.map(({ tids }) => s.push(...tids))
        const ms = new Set(s)
        const os = [...ms]
        os.sort((a, b) => this.resolveThread(b).date - this.resolveThread(a).date)
        return os
      })(this)
      success(...MAILAPI_TAG, "SYNC OLD OP - computed full inbox:", performance.now() - t0)

      //? Cache
      Satellite.store(this.currentMailbox + "emails/inbox", this.inbox)
      Satellite.store(this.currentMailbox + "emails/fullInbox", this.fullInbox)
      Satellite.store(this.currentMailbox + "threads", this.threads)

      this.syncing = false
      release()
    },
    async forceSync () {
      if (this.backendSyncing) {
        console.error("Backend already syncing.")
        return false
      }
      this.backendSyncing = true
      await this.engine.sync.immediate()
    },
    ////////////////////////////////////////////!
    //! Contact Methods
    ////////////////////////////////////////////!
    async suggestContact(term, limit=5) {
      const results = await this.engine.contacts.lookup(term)
      return results.slice(0, limit)
    },
    ////////////////////////////////////////////!
    //! Attachment Methods
    ////////////////////////////////////////////!
    async downloadAttachment(attachment) {
      await this.callIPC(this.task_DownloadAttachment(attachment))
    },
    async previewAttachment(attachment) {
      await this.callIPC(this.task_PreviewAttachment(attachment))
    },
    ////////////////////////////////////////////!
    //! View Management
    ////////////////////////////////////////////!
    //? check whether movements are allowed
    checkMove ({ to, from, draggedContext }) {
      //? prevents moving from&to inbox
      //! this is buggy so we dont use it anymore :/
      /*
      if (to.id == from.id && to.id == "aikomail--inbox") {
          info(...MAILAPI_TAG, "Cancelled move; to id:", to.id, "from id:", from.id)
          return false
      }
      */
      return true
    },
    //? properly adjust the UI to reflect that the thread is being dragged
    startMove ({ from, item }) {
      //? reflect that something is being dragged
      this.dragging = true

      //? verify the thread exists
      const tid = item.getAttribute('tid')
      const thread = this.resolveThread(tid)
      if (!thread) return error(...MAILAPI_TAG, "The thread that is being dragged has a TID that is not locally present.")

      //? reflect that it is being dragged
      thread.dragging = true
      this.saveThread(thread, reset=false)

      return true
    },
    //? adjust the UI to reflect the clone is... well, cloned
    cloneThread ({ item, clone }) {
      // you can do mail management on the "original"
      // which is the HTML element for email in `item`
      // and also clone which is the cloned email's
      // corresponding HTML element
      clone.classList.toggle('cloned', true)
    },
    //? after a drag is finished, reflect in the UI and prepare to communicate that to backend
    async moveThread ({ to, from, item, oldIndex, newIndex }) {
      //? reflect in the UI that dragging has stopped
      this.dragging = false

      //? identify the thread and its location
      const tid = item.getAttribute('tid')
      const thread = this.resolveThread(tid)
      if (!thread) return error(...MAILAPI_TAG, "The thread that was moved has a TID that cannot be resolved.")
      const threadLoc = this.locThread(thread)
      if (!threadLoc) return error(...MAILAPI_TAG, "Cannot find the locator for the thread.")

      //? ignore from-to same board
      if (from.id == to.id) {
        item.classList.toggle('cloned', false)
        return true
      }

      //? if we are dragging something back to the inbox, do everything right away
      if (to.id == 'aikomail--inbox') {
        //? remove any clones
        //! TODO: we probably don't need this anymore. the inbox doesnt need ghost clones
        // if (this.inbox.includes(tid)) this.inbox.splice(this.inbox.indexOf(tid), 1)

        //? immediately sync this, deleting it from its representative location
        if (thread.folder != this.folders.special.inbox) {
          info(...MAILAPI_TAG, "Deleting thread", tid, "from", thread.folder, "via email with UID", threadLoc.uid)
          await this.engine.manage.delete(threadLoc.folder, threadLoc.uid)
          thread.folder = this.folders.special.inbox
          this.saveThread(thread)
          this.movers.delete(tid)
        }
      }

      //? if we are dragging something to a board, defer the actual sync by Xs
      else {
        //? identify the board it is moving to
        const toSlug = to.id.substring('aikomail--'.length)
        const toPath = this.folders.boards.paths[toSlug]
        if (!toPath) return error(...MAILAPI_TAG, "Dragged thread to", toSlug, "but could not find that folder in the folder manager.")
        info(...MAILAPI_TAG, "Dragged thread", tid, "from", thread.folder, "to", toPath)

        //? update the UI right away!
        this.movers.add(tid)
        thread.dragging = false
        thread.folder = toPath
        this.saveThread(thread, reset=false)

        //? defer the sync
        const SYNC_TIMEOUT = 1500

        const _this = this
        const sync = async () => {
          //? re-identify the thread and its location
          const thread = _this.resolveThread(tid)
          if (!thread) return error(...MAILAPI_TAG, "The thread that was moved has a TID that cannot be resolved.")
          const threadLoc = _this.locThread(thread)
          if (!threadLoc) return error(...MAILAPI_TAG, "Cannot find the locator for the thread.")

          //? if it's been picked up again, we wait a bit.
          if (thread.dragging) {
            window.setTimeout(sync, SYNC_TIMEOUT)
            return warn(...MAILAPI_TAG, "Postponed moving thread", tid, "to", toSlug, "because it is being dragged")
          }

          //? if it's already syncing, prevent a race
          if (thread.syncing) return warn(...MAILAPI_TAG, 'Cancelled moving thread', tid, 'to', toSlug, 'because it is already being synced')

          //? if the destination folder has changed, prevent race
          if (thread.folder != toPath) return warn(...MAILAPI_TAG, 'Cancelled moving thread', tid, 'to', toSlug, 'because it was dragged elsewhere')

          //? lock the thread from concurrent syncs
          thread.syncing = true
          _this.saveThread(thread, reset=false)

          //? when deciding a sync strategy, we copy from the inbox and move from boards
          const strategy = (thread.originFolder == this.folders.special.inbox) ? this.engine.manage.copy : this.engine.manage.move;

          //? perform the movement
          const destUID = await strategy(threadLoc.folder, threadLoc.uid, thread.folder)

          if (!destUID) {
            console.error("Did not receive destination UID. Changes will correct in the next sync.")
          } else {
            //? find the email with the threadLoc
            thread.emails = thread.emails.map(email => {
              email.locations = email.locations.map(location => {
                if (location.folder == threadLoc.folder && location.uid == threadLoc.uid) {
                  location.folder = thread.folder
                  location.uid = destUID
                }
                return location
              })
              return email
            })
          }
          //? if it failed it will reflect in next backend sync
          //? otherwise the thread will simply be updated in the next backend sync

          info(...MAILAPI_TAG, "Moved thread", tid, "from", thread.originFolder, "to", thread.folder)

          //? reset the thread state
          _this.saveThread(thread, reset=!!destUID)
          _this.movers.delete(tid)
        }

        window.setTimeout(sync, SYNC_TIMEOUT)
      }

      this.recalculateHeight()
    },
    //? call this method after reordering boards to save the order
    async reorderBoards () {
      // this.boardOrder = this.boards.map(({ name }) => name)
      await Satellite.store(this.imapConfig.email + ':board-order', this.boardOrder)
    },
    //? sorts all threads across inbox and boards in ascending/descending order
    async sortThreads(newest=true) {
      info(...MAILAPI_TAG, "Sorting all threads by", newest ? 'newest':'oldest')
      const sorter = newest ?
        ((t1, t2) => this.resolveThread(t2).date - this.resolveThread(t1).date)
        : ((t1, t2) => this.resolveThread(t1).date - this.resolveThread(t2).date)
      ;;

      this.inbox.sort(sorter)
      this.special.sent.sort(sorter)
      this.special.drafts.sort(sorter)
      this.special.trash.sort(sorter)
      this.special.spam.sort(sorter)
      this.special.archive.sort(sorter)

      for (let i = 0; i < this.boards.length; i++)
        this.boards[i].tids.sort(sorter)
    },
    //? handles scrolling down to fetch more
    onScroll (e) {
      const { target: { scrollTop, clientHeight, scrollHeight } } = e
      if (scrollTop + clientHeight >= scrollHeight - 1000) {
        if (this.seekingInbox) return
        if (this.inbox.length > 2000) return;
        if (this.reachedEndOfInbox) return;
        info(...MAILAPI_TAG, 'Fetching more messages')
        this.seekingInbox = true
        const that = this
        this.syncOldOp().then(() => {
          that.seekingInbox = false
          that.onScroll(e)
        })
      }
      this.recalculateHeight()
    },
    recalculateHeight() {
      /* CONFIG */
      const THREAD_HEIGHT = 114 // height including padding
      const THREAD_SPACING = 15 // margin between items
      const TOLERANCE = 5 // # of items above/below rendered additionally
      /* END CONFIG */

      if (!this.$refs.inboxBoard) return;

      const { scrollHeight, scrollTop, clientHeight } = this.$refs.inboxBoard

      const scrollAmount = scrollTop
      const scrollViewHeight = clientHeight
      const scrollView = {
        min: scrollAmount,
        max: scrollAmount + scrollViewHeight
      }

      const itemHeight = THREAD_HEIGHT + THREAD_SPACING
      const listSize = (that => {
        if (that.fullInbox) return (that.priority) ? that.priorityFullInbox.length : that.otherFullInbox.length;
        return (that.priority) ? that.priorityInbox.length : that.otherInbox.length;
      })(this)
      const listHeight = listSize * itemHeight

      const threadsAbove = scrollView.min / itemHeight
      const threadsShown = scrollViewHeight / itemHeight
      const threadsBelow = (listHeight - scrollView.max) / itemHeight

      const indexMin = Math.floor(threadsAbove - TOLERANCE)
      const indexMax = Math.ceil((listSize - threadsBelow) + TOLERANCE)

      if (this.flow.regularView) {
        // adjust to full indices
        if (this.priority) {
          if (this.priorityFullInbox.length > 0) {
            const minTID = this.priorityFullInbox?.[indexMin] || this.priorityFullInbox[0]
            const maxTID = this.priorityFullInbox?.[indexMax] || this.priorityFullInbox.last()
            this.visibleMin = this.fullInbox.indexOf(minTID) - TOLERANCE
            this.visibleMax = this.fullInbox.indexOf(maxTID) + TOLERANCE
          }
        } else {
          if (this.otherFullInbox.length > 0) {
            const minTID = this.otherFullInbox?.[indexMin] || this.otherFullInbox[0]
            const maxTID = this.otherFullInbox?.[indexMax] || this.otherFullInbox.last()
            this.visibleMin = this.fullInbox.indexOf(minTID) - TOLERANCE
            this.visibleMax = this.fullInbox.indexOf(maxTID) + TOLERANCE
          }
        }
      }
      else if (this.priority) {
        // adjust to priority indices
        if (this.priorityInbox.length > 0) {
          const minTID = this.priorityInbox?.[indexMin] || this.priorityInbox[0]
          const maxTID = this.priorityInbox?.[indexMax] || this.priorityInbox.last()
          this.visibleMin = this.inbox.indexOf(minTID) - TOLERANCE
          this.visibleMax = this.inbox.indexOf(maxTID) + TOLERANCE
        }
      } else {
        // adjust to other indices
        if (this.otherInbox.length > 0) {
          const minTID = this.otherInbox?.[indexMin] || this.otherInbox[0]
          const maxTID = this.otherInbox?.[indexMax] || this.otherInbox.last()
          this.visibleMin = this.inbox.indexOf(minTID) - TOLERANCE
          this.visibleMax = this.inbox.indexOf(maxTID) + TOLERANCE
        }
      }
    },
  }
}

window.setInterval(() => {
  app.recalculateHeight()
}, 1000)
Notification.requestPermission()