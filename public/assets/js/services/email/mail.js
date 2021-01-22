const { app } = require("electron")

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
    //? manages mailboxes loaded into Aiko Mail
    mailboxes: [],
    currentMailbox: '',
    //? synced folders object
    folders: {},
    //? internal representation of threads
    threads: {}, //* tids[tid] = thread
    inbox: [], //* [tid]
    boardOrder: [], //* [slug]
    boardThiccness: [], //* [slug]
    boards: [], //* { ...board metadata, tids: [tid] }
    //? some state/ui management
    syncLock: SyncLock(),
    backendSyncing: false,
    syncing: false,
    movers: new Set(),
    dragging: false,
    visibleMin: 0,
    visibleMax: 500,
    //? smaller lists for priority and other to optimize the UI
    priorityInbox: [],
    otherInbox: [],
  },
  watch: {
    'inbox': async function (_) {
      const priorityInbox = []
      const otherInbox = []

      this.resolveThreads(this.inbox).map(({ tid, priority }) => {
        if (priority) priorityInbox.push(tid)
        else otherInbox.push(tid)
      })

      this.priorityInbox = priorityInbox
      this.otherInbox = otherInbox

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
        await this.engine.close()
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

      //? bind engine listeners
      this.engine.on('sync-started', () => {
        app.backendSyncing = true
      })
      this.engine.on('sync-finished', this.syncOp)

      //? reset the UI
      this.inbox = []
      this.boards = []

      //? create local boards
      this.folders = await this.engine.folders.get()
      Object.keys(this.folders.aiko).map(slug => {
        const path = this.folders.aiko[slug]
        this.boards.push({
          name: slug,
          thin: false,
          path,
          tids: []
        })
      })

      //? restore thinness to boards
      this.boardThiccness = await SmallStorage.load(this.imapConfig.email + ':board-thiccness') || []
      this.boardThiccness.map(slug => {
        const board = this.boards.filter(({ name }) => name == slug)?.[0]
        if (!board) return warn(...MAILAPI_TAG, "The", slug, "board no longer exists and will be removed from board order.")
        const i = this.boards.indexOf(board)
        this.boards[i].thin = true
      })

      //? sort the local boards
      this.boardOrder = await SmallStorage.load(this.imapConfig.email + ':board-order') || []
      const tmp_boards = JSON.parse(JSON.stringify(this.boards))
      const tmp2_boards = []
      this.boardOrder.map(slug => {
        const board = tmp_boards.filter(({ name }) => name == slug)?.[0]
        if (!board) return warn(...MAILAPI_TAG, "The", slug, "board no longer exists and will be removed from board order.")
        const i = tmp_boards.indexOf(board)
        tmp2_boards.push(tmp_boards.splice(i, 1))
      })
      tmp2_boards.push(...tmp_boards)
      this.boards = tmp2_boards
      this.boardOrder = this.boards.map(({ name }) => name)
      await SmallStorage.store(this.imapConfig.email + ':board-order', this.boardOrder)

      //? start syncing
      info(...MAILAPI_TAG, "Starting engine sync.")
      await this.engine.sync.immediate()

      //? save IMAP configuration again as an extra measure (in case the OAuth tokens updated)
      info(...MAILAPI_TAG, 'Saving config...')
      await this.saveIMAPConfig()

      //? set the new title
      document.title = `Inbox - ${this.currentMailbox}`

      console.timeEnd('SWITCH MAILBOX')
      if (controlsLoader) this.loading = false
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
      return `[Aiko Mail]/${slug}`
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
      if (reset) {
        thread.dragging = false
        thread.syncing = false
        thread.originFolder = thread.aikoFolder
        //? compute priority
        thread.priority = (() => {
          for (const email of thread.emails) {
            if (email.M.priority) return true
          }
          return false
        })()
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
      const folders = await this.engine.folders.get()
      if (folders.aiko?.[slug]) return error(...MAILAPI_TAG, "Tried to create board with slug", slug, "but it already exists!")
      await this.engine.folders.add(path)
      //? confirm it was added
      const updatedFolders = await this.engine.folders.get()
      if (!(updatedFolders.aiko?.[slug])) return error(...MAILAPI_TAG, "Tried to create board with slug", slug, "but failed to create the matching folder.")
      //? add that to the sync set
      await this.engine.sync.add(path)
      //? create a UI element for it
      boards.push({
        name: slug,
        thin: false,
        path,
        tids: []
      })

      this.boardOrder = this.boards.map(({ name }) => name)
      await SmallStorage.store(this.imapConfig.email + ':board-order', this.boardOrder)
    },
    ////////////////////////////////////////////!
    //! Syncing with Backend
    ////////////////////////////////////////////!
    async syncOp () {
      const release = await this.syncLock.acquire()
      this.backendSyncing = false
      this.syncing = true
      //? update folders
      this.folders = await this.engine.folders.get()
      //? if a board no longer exists, delete it
      for (let i = 0; i < this.boards.length;) {
        const { name } = this.boards[i]
        if (!(this.folders.aiko?.[name])) {
          this.boards.splice(i, 1)
        } else i++;
      }
      //? locally adds new boards
      Object.keys(this.folders.aiko).map(slug => {
        const local_board = this.boards.filter(({ name }) => name == slug)?.[0]
        if (local_board) return;
        //? if it doesn't exist locally we need to create the UI element for it
        this.boards.push({
          name: slug,
          thin: false,
          path: this.folders.aiko[slug],
          tids: []
        })

        this.boardOrder = this.boards.map(({ name }) => name)
        await SmallStorage.store(this.imapConfig.email + ':board-order', this.boardOrder)

      })
      //? compute local cursor
      const cursors = Object.values(this.threads).map(({ cursor }) => cursor)
      const cursor = Math.max(...cursors, -1)
      //? fetch updates to inbox
      const max_inbox_updates = Math.max(5000, this.inbox.length)
      const inbox_updates = await this.engine.api.get.latest(this.folders.inbox, cursor, limit=max_inbox_updates)
      //? apply updates to inbox
      inbox_updates.map(({ exists, threads }) => {
        //? first, anything that is no longer in exists can be dumped
        const existsTIDs = exists.map(({ tid }) => tid)
        this.inbox = this.inbox.filter(tid => existsTIDs.includes(tid))
        //? next, process the threads
        threads.map(thread => {
          thread = this.saveThread(thread)
          //? first, determine if we have it locally
          const local = this.inbox.includes(thread.tid)
          //? since we resolve directly, this should update existing emails without us having to
          //! if you want to force a UI change, can do a stringify-parse set on the tids
          //? if we don't have it, we need to add it
          if (!local) this.inbox.unshift(tid) //* unshift because it is in ascending date order
        })
      })
      //? sort the inbox to maintain date invariant
      this.inbox.sort((a, b) => this.resolveThread(b).date - this.resolveThread(a).date)
      //? fetch updates to boards
      this.boards.map(({ path, tids }, i) => {
        const max_board_updates = Math.max(1000, tids.length)
        const board_updates = await this.engine.api.get.latest(path, cursor, limit=max_board_updates)
        //? apply updates to inbox
        board_updates.map(({ exists, threads }) => {
          //? first, anything that is no longer in exists can be dumped
          const existsTIDs = exists.map(({ tid }) => tid)
          this.boards[i].tids = this.boards[i].tids.filter(tid => existsTIDs.includes(tid))
          //? next, process the threads
          threads.map(thread => {
            thread = this.saveThread(thread)
            //? first, determine if we have it locally
            const local = tids.includes(thread.tid)
            //? since we resolve directly, this should update existing emails without us having to
            //! if you want to force a UI change, can do a stringify-parse set on the tids
            //? if we don't have it, we need to add it
            if (!local) this.boards[i].tids.unshift(tid) //* unshift because it is in ascending date order
          })
        })
        this.boards[i].tids.sort((a, b) => this.resolveThread(b).date - this.resolveThread(a).date)
      })
      this.syncing = false
      release()
    },
    async forceSync () {
      if (this.backendSyncing) return false
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
      const tid = item.getAttribute(tid)
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
        if (thread.aikoFolder != this.folders.inbox) {
          info(...MAILAPI_TAG, "Deleting thread", tid, "from", thread.aikoFolder, "via email with UID", threadLoc.uid)
          await this.engine.api.manage.delete(threadLoc.folder, threadLoc.uid)
          thread.aikoFolder = this.folders.inbox
          this.saveThread(thread)
          this.movers.remove(tid)
        }
      }

      //? if we are dragging something to a board, defer the actual sync by Xs
      else {
        //? identify the board it is moving to
        const toSlug = to.id.substring('aikomail--'.length)
        const toPath = this.folders.aiko[toSlug]
        if (!toPath) return error(...MAILAPI_TAG, "Dragged thread to", toSlug, "but could not find that folder in the folder manager.")
        info(...MAILAPI_TAG, "Dragged thread", tid, "from", thread.aikoFolder, "to", toPath)

        //? update the UI right away!
        this.movers.add(tid)
        thread.dragging = false
        thread.aikoFolder = toPath
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
          if (thread.aikoFolder != toPath) return warn(...MAILAPI_TAG, 'Cancelled moving thread', tid, 'to', toSlug, 'because it was dragged elsewhere')

          //? lock the thread from concurrent syncs
          thread.syncing = true
          _this.saveThread(thread, reset=false)

          //? when deciding a sync strategy, we copy from the inbox and move from boards
          const strategy = (thread.originFolder == this.folders.inbox) ? this.engine.api.manage.copy : this.engine.api.manage.move;

          //? perform the movement
          await strategy(threadLoc.folder, threadLoc.uid, thread.aikoFolder)

          //? we don't need the result UID and we don't manage failures
          //? if it failed it will reflect in next backend sync
          //? otherwise the thread will simply be updated in the next backend sync

          info(...MAILAPI_TAG, "Moved thread", tid, "from", thread.originFolder, "to", thread.aikoFolder)

          //? reset the thread state
          _this.saveThread(thread, reset=true)
          this.movers.remove(tid)
        }

        window.setTimeout(sync, SYNC_TIMEOUT)
      }

      this.recalculateHeight()
    },
    //? call this method after reordering boards to save the order
    async reorderBoards () {
      this.boardOrder = this.boards.map(({ name }) => name)
      await SmallStorage.store(this.imapConfig.email + ':board-order', this.boardOrder)
    },
    //? sorts all threads across inbox and boards in ascending/descending order
    async sortThreads(newest=true) {
      info(...MAILAPI_TAG, "Sorting all threads by", newest ? 'newest':'oldest')
      const sorter = newest ?
        ((t1, t2) => this.resolveThread(t2).date - this.resolveThread(t1).date)
        : ((t1, t2) => this.resolveThread(t1).date - this.resolveThread(t2).date)
      ;;

      for (let i = 0; i < this.boards.length; i++)
        this.boards[i].tids.sort(sorter)
    },
    //? handles scrolling down to fetch more
    onScroll (e) {
      const { target: { scrollTop, clientHeight, scrollHeight } } = e
      //! TODO: reenable this at some point
      /*
      if (scrollTop + clientHeight >= scrollHeight - 1000) {
        if (this.seekingInbox) return
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
      */
      this.recalculateHeight()
    },
    recalculateHeight() {
      /* CONFIG */
      const THREAD_HEIGHT = 114 // height including padding
      const THREAD_SPACING = 15 // margin between items
      const TOLERANCE = 10 // # of items above/below rendered additionally
      /* END CONFIG */

      const { scrollHeight, scrollTop, clientHeight } = this.$refs.inboxBoard

      const scrollAmount = scrollTop
      const scrollViewHeight = clientHeight
      const scrollView = {
        min: scrollAmount,
        max: scrollAmount + scrollViewHeight
      }

      const itemHeight = THREAD_HEIGHT + THREAD_SPACING
      const listSize = (this.priority ? this.priorityInbox.length : this.otherInbox.length)
      const listHeight = listSize * itemHeight

      const threadsAbove = scrollView.min / itemHeight
      const threadsShown = scrollViewHeight / itemHeight
      const threadsBelow = (listHeight - scrollView.max) / itemHeight

      const indexMin = Math.floor(threadsAbove - TOLERANCE)
      const indexMax = Math.ceil((listSize - threadsBelow) + TOLERANCE)

      if (this.priority) {
        // adjust to priority indices
        if (this.priorityInbox.length > 0) {
          const minTID = this.priorityInbox?.[indexMin] || this.priorityInbox[0]
          const maxTID = this.priorityInbox?.[indexMax] || this.priorityInbox.last()
          this.visibleMin = this.inbox.indexOf(minTID) - TOLERANCE
          this.visibleMax = this.inbox.emails.indexOf(maxTID) + TOLERANCE
        }
      } else {
        // adjust to other indices
        if (this.otherInbox.length > 0) {
          const minTID = this.otherInbox?.[indexMin] || this.otherInbox[0]
          const maxTID = this.otherInbox?.[indexMax] || this.otherInbox.last()
          this.visibleMin = this.inbox.emails.indexOf(minTID) - TOLERANCE
          this.visibleMax = this.inbox.emails.indexOf(maxTID) + TOLERANCE
        }
      }
    },
  }
}

window.setInterval(() => {
  app.recalculateHeight()
}, 1000)
window.onresize = app.recalculateHeight

Notification.requestPermission()