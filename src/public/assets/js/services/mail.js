const MAILAPI_TAG = ['%c[MAIL API]', 'background-color: #ffdddd; color: #000;']

const SECONDS = 1000
let TIMEOUT = 30 * SECONDS

const mailapi = {
  data: {
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
    mailboxes: [],
    currentMailbox: '',
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
    async initIMAP () {
      info(...MAILAPI_TAG, 'Registering listeners...')
      ipcRenderer.on('email was deleted',
        (_, {
          path,
          seq
        }) => app.onDeleteEmail(path, seq))
      ipcRenderer.on('exists value changed',
        (_, {
          path,
          seq
        }) => app.onSyncRequested(path, seq))
      info(...MAILAPI_TAG, 'Loading address cache...')
      this.mailboxes = (await SmallStorage.load('mailboxes')) || []
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
      this.currentMailbox = currentEmail
      info(...MAILAPI_TAG, 'Loading IMAP config...')
      await this.loadIMAPConfig(currentEmail)
      if (!this.imapConfig.email) {
        error(...MAILAPI_TAG, 'Was unable to load IMAP config. Must be some Time Machine issue.')
        this.forceAddMailbox = true
        return
      }
      if (this.imapConfig.provider == 'google') {
        info(...MAILAPI_TAG, 'Loading Google config...')
        await this.google_loadConfig()
        await this.google_checkTokens()
      }
    },
    async saveIMAPConfig () {
      await SmallStorage.store(this.imapConfig.email + '/imap-config', this.imapConfig)
    },
    async loadIMAPConfig (email) {
      this.imapConfig = await SmallStorage.load(email + '/imap-config')
    },
    // Wrapper methods to create corresponding IPC tasks
    task_MakeNewClient (config) {
      return this.ipcTask('please make new client', config)
    },
    task_ConnectToServer () {
      return this.ipcTask('please connect to server', {})
    },
    task_DisconnectFromServer () {
      return this.ipcTask('please disconnect from server', {})
    },
    task_ListFolders () {
      return this.ipcTask('please list folders', {})
    },
    task_NewFolder (path) {
      return this.ipcTask('please make a new folder', {
        path
      })
    },
    task_DeleteFolder (path) {
      return this.ipcTask('please delete a folder', {
        path
      })
    },
    task_OpenFolder (path) {
      return this.ipcTask('please open a folder', {
        path
      })
    },
    task_FetchEmails (path, sequence, peek, modseq, limit, downloadAttachments, markAsSeen, keepCidLinks=true) {
      return this.ipcTask('please get emails', {
        path,
        sequence,
        peek,
        // modseq,
        limit,
        downloadAttachments,
        markAsSeen,
        keepCidLinks
      })
    },
    task_SearchEmails (path, query) {
      /*
                SEARCH UNSEEN
                query = {unseen: true}
                SEARCH KEYWORD 'flagname'
                query = {keyword: 'flagname'}
                SEARCH HEADER 'subject' 'hello world'
                query = {header: ['subject', 'hello world']};
                SEARCH UNSEEN HEADER 'subject' 'hello world'
                query = {unseen: true, header: ['subject', 'hello world']};
                SEARCH OR UNSEEN SEEN
                query = {or: {unseen: true, seen: true}};
                SEARCH UNSEEN NOT SEEN
                query = {unseen: true, not: {seen: true}}
                SINCE 2011-11-23
                query = {since: new Date(2011, 11, 23, 0, 0, 0)}
            */
      return this.ipcTask('please look for emails', {
        path,
        query
      })
    },
    task_SetFlags (path, sequence, flags) {
      // there is a non-blind version of this that returns the emails
      // just set blind: false in the payload
      return this.ipcTask('please set email flags', {
        path,
        sequence,
        flags,
        blind: true
      })
    },
    task_DeleteEmails (path, sequence) {
      return this.ipcTask('please delete emails', {
        path,
        sequence
      })
    },
    task_CopyEmails (srcPath, dstPath, sequence) {
      return this.ipcTask('please copy emails', {
        srcPath,
        dstPath,
        sequence
      })
    },
    task_UploadEmail (dstPath, message) {
      return this.ipcTask('please upload an email', {
        dstPath, message
      })
    },
    task_MoveEmails (srcPath, dstPath, sequence) {
      return this.ipcTask('please move emails', {
        srcPath,
        dstPath,
        sequence
      })
    },
    // Listener methods
    async onDeleteEmail (path, seq) {
      // TODO: seq is the sequence number of the deleted message
      // should check if we have seq in our local version of
      // the folder with "path"
      // if so, remove that message locally (to maintain sync)
    },
    async onSyncRequested (path, seq) {
      // TODO: sync when requested
      // probably only need to sync if path is inbox or a board
    },
    async onIMAPConnectionError () {
      // NOTE: this is less of a listener and something this module calls
      // app.toastIMAPError()
      // TODO: uncomment once the toast manager has been configured
    },
    // Utility methods
    folderWithSlug (slug) {
      if (!slug) {
        error(...MAILAPI_TAG, 'Board slug is empty, defaulting to Uncategorized')
        slug = 'Uncategorized'
      }
      return `[Aiko Mail]/${slug}`
    },
    async newBoard (slug) {
      const boardName = this.folderWithSlug(slug)
      if (this.boards[boardName]) return error('Tried to create board that exists.')
      await this.callIPC(this.task_NewFolder(boardName))
      Vue.set(this.boards, boardName, {
        uidLatest: -1,
        emails: []
        // modSeq: -1,
      })
      this.boardNames.push(boardName)
    },
    async findFolderNames () {
      // load cache for folderNames and boardNames
      this.folderNames = (
        await SmallStorage.load(this.imapConfig.email + ':folder-names') ||
                this.folderNames
      )
      this.boardNames = (
        await SmallStorage.load(this.imapConfig.email + ':board-names') ||
                this.boardNames
      )

      // Fetch remote folders
      const folders = await this.callIPC(this.task_ListFolders())
      if (!folders || !(typeof folders === 'object')) return error(...MAILAPI_TAG, folders)

      // Default folder names
      this.folderNames.inbox = 'INBOX'
      if (this.imapConfig.provider == 'google') {
        this.folderNames.sent = '[Gmail]/Sent Email'
        this.folderNames.starred = '[Gmail]/Starred'
        this.folderNames.spam = '[Gmail]/Spam'
        this.folderNames.drafts = '[Gmail]/Drafts'
        this.folderNames.archive = '[Gmail]/All Mail'
        this.folderNames.trash = '[Gmail]/Trash'
      } else {
        const allfolders = []
        const walk = folder => {
          allfolders.push(folder.path)
          allfolders.push(...Object.values(folder?.children).map(_ => _.path))
        }
        Object.values(folders).map(walk)
        const detectFolderName = keyword => {
          const matches = allfolders.filter(f => f.includes(keyword))
          if (matches.length > 0) return matches[0]
          return ''
        }
        this.folderNames.sent = detectFolderName('Sent')
        this.folderNames.starred = detectFolderName('Star')
        this.folderNames.spam = detectFolderName('Spam') || detectFolderName('Junk')
        this.folderNames.drafts = detectFolderName('Drafts')
        this.folderNames.archive = detectFolderName('All Mail') || detectFolderName('Archive')
        this.folderNames.trash = detectFolderName('Trash') || detectFolderName('Deleted')
      }
      /// //////

      // Form local boards
      this.folderNames.done = this.folderWithSlug('Done')
      const localBoards = [
        ...this.boardNames,
        this.folderNames.done
      ]
      /// //////

      // Form remote boards
      const aikoFolder = folders['[Aiko Mail]']
      // If there is no Aiko Mail folder on remote, make it
      if (!aikoFolder) {
        info(...MAILAPI_TAG, 'Making the Aiko Mail folder on MX as it does not exist otherwise.')
        if (!(
          await this.callIPC(this.task_NewFolder('[Aiko Mail]'))
        )) return error(...MAILAPI_TAG, "Couldn't make Aiko Mail folder on MX!")
      }
      // Collect remote boards
      const remoteBoards = Object.values(aikoFolder?.children || {}).map(_ => _.path)
      /// //////

      // if there is a board locally that is not on MX, make it
      const MakeFolders = localBoards
        .filter(_ => !(remoteBoards.includes(_)))
        .map(path => this.task_NewFolder(path))
      const results = MakeFolders.length > 0 ? await this.callIPC(...MakeFolders) : []
      if (results.length != null) {
        for (const result of results) {
          if (!(result?.path)) { return error(...MAILAPI_TAG, result) }
        }
      } else if (!(results?.path)) return error(...MAILAPI_TAG, results)
      // if there is a board on MX that is not local, make it
      this.boardNames.push(...(
        remoteBoards.filter(_ => !(localBoards.includes(_)))
      ))
      // If 'Done' is the only board locally then make a 'To-Do' board
      if (this.boardNames.length == 0) {
        info(...MAILAPI_TAG, "Making a To-Do board as it doesn't exist otherwise.")
        const todoPath = this.folderWithSlug('To-Do')
        const todoResult = await this.callIPC(this.task_NewFolder(todoPath))
        if (!todoResult || todoResult.error) { return error(...MAILAPI_TAG, "Couldn't make To-Do board:", todoResult?.error) }
        this.boardNames.push(todoPath)
      }

      await SmallStorage.store(this.imapConfig.email + ':folder-names', this.folderNames)
      await SmallStorage.store(this.imapConfig.email + ':board-names', this.boardNames)
    },
    async fetchContacts() {
      const contactCache = (
        await BigStorage.load(this.imapConfig.email + '/contacts')
        || this.contacts
      )
      Object.assign(this.contacts, contactCache)

      const getSenders = email => {
        const senders = []
        if (email?.envelope?.from?.length > 0) senders.push(...email.envelope.from)
        if (email?.envelope?.sender?.length > 0) senders.push(...email.envelope.sender)
        if (email?.envelope?.to?.length > 0) senders.push(...email.envelope.to)
        return senders
      }

      const newSenders = {}

      const {
        uidNext
      } = await this.callIPC(this.task_OpenFolder('INBOX'))
      if (!uidNext) return error(...(MAILAPI_TAG), "Didn't get UIDNEXT when opening inbox for contact collection.")
      if (uidNext > this.contacts.inboxUID) {
        // collect all emails in batches of 500, peeked
        const BATCH_SIZE = 2000
        let CUR_UID = Math.max(this.contacts.inboxUID, uidNext - 40000) // 40k emails is a lot.
        while (CUR_UID < uidNext) {
          const uidMin = CUR_UID
          const uidMax = Math.min(uidNext, uidMin + BATCH_SIZE)
          info(...MAILAPI_TAG, "Collecting contacts from emails", uidMin, "to", uidMax)
          const batch = await this.callIPC(this.task_FetchEmails("INBOX", `${uidMin}:${uidMax}`, true))
          if (!batch || (!batch?.length && batch?.length != 0)) {
            console.warn("No batch returned while seeking inbox for contact collection:", batch)
          } else {
            batch.map(e => {
              const e_senders = getSenders(e)
              e_senders.filter(_=>_).map(s => {
                const key = s.address.toLowerCase()
                newSenders[key] = {
                  name: newSenders[key]?.name || s.name || '',
                  frequency: (newSenders[key]?.frequency || 0) + 1
                }
              })
            })
          }
          CUR_UID = uidMax + 1
        }
      }

      /*
        Contact structure:
          [ address, name, frequency ]
        Contact search:
          address.indexOf(term) > -1 || name.indexOf(term) > -1
          sort by frequency
      */

      // to add new senders, first we combine the tree with the existing contacts
      const oldSenders = this.contacts.allContacts
      for (const sender of oldSenders) {
        const [address, name, frequency] = sender
        if (newSenders[address]) {
          newSenders[address].frequency += (frequency || 0)
        } else {
          newSenders[address] = {
            name, frequency
          }
        }
      }

      // then we build the array formatted for contacts
      const contacts = []
      for (const address in newSenders) {
        const { name, frequency } = newSenders[address]
        contacts.push(
          [address, name, frequency]
        )
      }

      this.contacts.allContacts = contacts
      this.contacts.inboxUID = uidNext

      info(...MAILAPI_TAG, "Finished collecting all contacts.")
      await BigStorage.store(this.imapConfig.email + '/contacts', this.contacts)
    },
    async suggestContact(term, limit=5) {
      const results = []
      for (const contact of app.contacts.allContacts) {
        const [address, name, frequency] = contact
        if (term.length < 3) {
          if (
            (address && address.startsWith(term)) || (name && name.startsWith(term))
          ) results.push([address, name, frequency])
        } else {
          if (
            (address && address.indexOf(term) > -1) || (name && name.indexOf(term) > -1)
          ) results.push([address, name, frequency])
        }
      }
      return results.sort((r1, r2) => r2[2] - r1[2]).slice(0, limit)
    },
    async switchMailbox(email) {
      this.loading = true
      await this.loadIMAPConfig(email)
      if (this.loadSMTPConfig) await this.loadSMTPConfig(email)
      this.loading = false
      await this.switchMailServer()
    },
    // Manage mailservers
    async reconnectToMailServer () {
      let results
      if (!this.currentMailbox) return error(...MAILAPI_TAG, "There is no selected mailbox.")
      await this.loadIMAPConfig(this.currentMailbox) //* reload config just in case !
      if (this.connected) {
        results = await this.callIPC(
          this.task_DisconnectFromServer(),
          this.task_MakeNewClient(this.imapConfig),
          this.task_ConnectToServer()
        )
      } else {
        results = await this.callIPC(
          this.task_MakeNewClient(this.imapConfig),
          this.task_ConnectToServer()
        )
      }
      if (results.error) {
        this.connected = false
        this.onIMAPConnectionError()
        return (this.connected = false)
      }
      TIMEOUT = 30 * SECONDS
      return (this.connected = true)
    },
    async switchMailServer () {
      const controlsLoader = !(this.loading)
      if (controlsLoader) this.loading = true
      this.syncing = true
      this.cachingInbox = true
      // PRECONDITION: assumes imapConfig is your new mailbox
      // CAUTION!!! this will switch the entire mailbox
      console.time('SWITCH MAILBOX')
      if (!this.imapConfig?.email) {
        warn(...MAILAPI_TAG, 'Tried switching server but no current email.')
        if (controlsLoader) this.loading = false
        return false // wtf
      }
      info(...MAILAPI_TAG, 'Switching mailbox to ' + this.imapConfig.email)
      if (!this.mailboxes.includes(this.imapConfig.email)) {
        this.mailboxes.push(this.imapConfig.email)
        await SmallStorage.store('mailboxes', this.mailboxes)
      }
      this.currentMailbox = this.imapConfig.email
      await SmallStorage.store('current-mailbox', this.imapConfig.email)
      await this.saveIMAPConfig()
      if (this.saveSMTPConfig) await this.saveSMTPConfig()

      // Connect to mailserver
      info(...MAILAPI_TAG, 'Connecting to MX...')
      if (this.imapConfig.provider == 'google') {
        await this.google_checkTokens()
      }
      if (!(await this.reconnectToMailServer())) {
        if (controlsLoader) this.loading = false
        return false
      }

      this.inbox.uidLatest = -1
      this.inbox.emails = []
      this.done.uidLatest = -1
      this.done.emails = []
      this.boardNames = []
      this.folderNames = {
        inbox: 'INBOX',
        sent: '',
        starred: '',
        spam: '',
        drafts: '',
        archive: '',
        trash: ''
      }
      await this.findFolderNames()

      info(...MAILAPI_TAG, 'Loading cache...')
      // load cache for the inbox
      const inboxCache = (
        await BigStorage.load(this.imapConfig.email + '/inbox') ||
                this.inbox)
      inboxCache.emails = await MailCleaner.peek('INBOX', inboxCache.emails)
      this.inbox = inboxCache
      info(...MAILAPI_TAG, 'Loaded Inbox Cache.')
      // load cache for the boards
      const boardCache = (
        await BigStorage.load(this.imapConfig.email + '/boards') || this.boards)
      this.boards = boardCache
      info(...MAILAPI_TAG, 'Loaded Board Cache.')
      // load cache for done
      const doneCache = (
        await BigStorage.load(this.imapConfig.email + '/done') ||
                this.done)
      doneCache.emails = await MailCleaner.peek(this.folderNames.done, doneCache.emails)
      this.done = doneCache
      info(...MAILAPI_TAG, 'Loaded Done Cache.')

      this.syncing = false
      this.cachingInbox = false

      await this.memoryLinking()
      info(...MAILAPI_TAG, 'Linked memory.')

      info(...MAILAPI_TAG, 'Saving config...')
      await this.saveIMAPConfig()

      // if there is no cache do a full sync
      info(...MAILAPI_TAG, 'Checking for need to do a sync...')
      if (this.inbox.emails.length == 0) {
        await this.initialSyncWithMailServer()
      } else {
        this.inbox.uidLatest = Math.max(...this.inbox.emails.map(email => email.inboxUID || email.uid))
      }

      console.timeEnd('SWITCH MAILBOX')
      if (controlsLoader) this.loading = false

      await this.memoryLinking()

      document.title = `Inbox - ${this.currentMailbox}`

      this.syncing = false
      // update & check for new messages, then fetch contacts, all in background
      this.updateAndFetch().then(this.fetchContacts)
    },
    // Sync
    async initialSyncWithMailServer () {
      info(...MAILAPI_TAG, 'Performing initial sync with mailserver.')
      console.time('Initial Sync')
      const controlsLoader = !(this.loading)
      this.loading = true // its so big it blocks I/O
      this.syncing = true

      const {
        uidNext
      } = await this.callIPC(this.task_OpenFolder('INBOX'))
      if (!uidNext) return error(...(MAILAPI_TAG), "Didn't get UIDNEXT.")

      info(...MAILAPI_TAG, 'Fetching latest 200 emails from inbox.')

      let MESSAGE_COUNT = 0
      const MAX_COUNT = 200
      const INCREMENT = MAX_COUNT * 2 // GOTTA GO FAT
      const emails = []
      let uidMax = uidNext
      let uidMin = uidMax
      while (MESSAGE_COUNT < MAX_COUNT && uidMin > 1) {
        uidMin = Math.max(uidMax - INCREMENT, 1)
        info(...MAILAPI_TAG, `Fetching ${uidMin}:${uidMax}...`)
        const received = await this.callIPC(
          this.task_FetchEmails('INBOX', `${uidMin}:${uidMax}`, false, null, MAX_COUNT - MESSAGE_COUNT, false, false, false))
        info(...MAILAPI_TAG, 'Parsing...')
        if (!(received?.reverse)) return error(...MAILAPI_TAG, received)
        MESSAGE_COUNT += received.length
        const processed_received = await MailCleaner.full('INBOX', received.reverse())
        emails.push(...processed_received)
        uidMax = uidMin - 1
        info(...MAILAPI_TAG, MAX_COUNT - MESSAGE_COUNT, 'left to fetch...')
      }

      if (!(emails?.reverse)) return error(...MAILAPI_TAG, emails)
      const processed_emails = emails // await MailCleaner.full(emails)

      // DANGER: this is scary and takes like 30s on main thread
      // super super dangerous, avengers level threat
      /*
            info(...MAILAPI_TAG, "Peeking 4000 additional messages for threading.")
            uidMin = Math.max(uidMax - 4000, 1)
            const thread_messages = await this.callIPC(
                this.task_FetchEmails("INBOX", `${uidMin}:${uidMax}`, true))
            if (!(thread_messages?.reverse)) return error(...MAILAPI_TAG, thread_messages)
            const processed_old_emails = await MailCleaner.peek(thread_messages)
            */

      this.inbox.emails = processed_emails
      if (this.inbox.emails.length > 0) { this.inbox.uidLatest = Math.max(...this.inbox.emails.map(email => email.inboxUID || email.uid)) }

      await this.memoryLinking()
      if (controlsLoader) this.loading = false
      this.syncing = false
      console.timeEnd('Initial Sync')
    },
    async syncWithMailServer () {
      // TODO: sync messages that we have locally
      // doesn't use modseq
      // i don't think we will need this so it's unwritten
      // maybe this should be specifically for syncing the
      // sent, trash, drafts etc folders to the mailserver
    },
    // Linking & cache
    async memoryLinking () {
      for (const board of this.boardNames) {
        // TODO: this could easily be refactored into a map or something
        // for every email in this board
        for (let i = 0; i < this.boards[board]?.emails.length; i++) {
          // check if email is in inbox
          for (let j = 0; j < this.inbox?.emails.length; j++) {
            if (this.inbox.emails[j]?.envelope?.['message-id'] == this.boards[board].emails[i]?.envelope?.['message-id']) {
              // link them in memory
              const wasUID = this.inbox.emails[j].inboxUID || this.inbox.emails[j].uid
              Vue.set(this.inbox.emails, j, this.boards[board].emails[i])
              if (!(this.boards[board].emails[i].inboxUID)) {
                this.boards[board].emails[i].inboxUID = wasUID
              }
            }
          }
        }
      }
      // memory linking for done board
      for (let i = 0; i < this.done?.emails.length; i++) {
        // check if email is in inbox
        for (let j = 0; j < this.inbox?.emails.length; j++) {
          if (this.inbox.emails[j]?.envelope?.['message-id'] == this.done.emails[i]?.envelope?.['message-id']) {
            // link them in memory
            const wasUID = this.inbox.emails[j].inboxUID || this.inbox.emails[j].uid
            Vue.set(this.inbox.emails, j, this.done.emails[i])
            if (!(this.done.emails[i].inboxUID)) {
              this.done.emails[i].inboxUID = wasUID
            }
          }
        }
      }
    },
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
    // Utility for big sync
    async updateAndFetch () {
      info(...MAILAPI_TAG, 'Running update and fetch.')
      // simply checkForUpdates and checkForNewMessages both
      if (this.syncing) return warn(...MAILAPI_TAG, 'Already syncing. Cancelling flow.')
      this.syncing = true
      await this.checkForNewMessages()
      console.time("Threading")
      await this.checkForUpdates()
      console.timeEnd("Threading")
      this.syncing = false
      await this.halfThreading().catch(error)
      this.inbox.emails = this.inbox.emails.sort((e1, e2) => e2.envelope.date - e1.envelope.date)
      this.boards = JSON.parse(JSON.stringify(this.boards))
      await this.memoryLinking()
      await this.cleanup()
    },
    // New message retrieval
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
        return this.checkBoardForNewMessages(boardName)
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
    // Update existing messages
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
    // Old message retrieval
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
    // Hiding messages on the mailserver
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
    // Threading
    async getThread (email, force=false) {
      // returns thread array for email
      // NOTE: threads are peeked!
      // TODO: write a non-peeked version
      // maybe to at least get references :)
      // FIXME: this doesn't completely work
      // for example it breaks with concurrent replies
      // and if someone replies to a message that wasn't sent to you
      // then it breaks as well.
      // would help to match subjects as well,
      // and then to include the subject

      // if it already has been computed return its thread
      if (email?.parsed?.thread && !force) return email.parsed.thread
      if (email?.parsed?.thread && email?.parsed?.thread.length > 0) return email.parsed.thread

      // thread will not include the current message.
      // this creates a circular structure. big no!
      const thread = []
      // message ids is just the id of every message we've already
      // put into thread
      const message_ids = new Set()

      let iterations = 0
      const MAX_ITER = 50

      // takes an email and gives you array of messages that it is replying to
      const find_replies = async (email, bySubject=false) => {
        const reply_id = email.envelope?.['in-reply-to']
        const subject = email?.ai?.cleanSubject
        const date = new Date(email?.envelope?.date)
        const mid = email.envelope['message-id']

        // log("Looking for", reply_id)

        // check to make sure we didn't already get it
        if (message_ids.has(reply_id)) return []
        //message_ids.add(reply_id)

        // enforce max iterations so not to crash the app
        if (iterations > MAX_ITER) {
          warn(...MAILAPI_TAG, 'Reached max iteration count while finding replies.')
          return []
        }

        const replies = []

        // search inbox
        for (let i = 0; i < this.inbox.emails.length; i++) {
          const email = this.inbox.emails[i]
          if (!message_ids.has(email.envelope['message-id']) && email.envelope['message-id'] == reply_id || (bySubject && email?.ai?.cleanSubject == subject && mid != email.envelope['message-id'])) {
            // emails in the future can't be valid historical messages
            const threaded_date = new Date(email?.envelope?.date)
            if (threaded_date > date) continue;
            // log("Had email in inbox.")
            this.inbox.emails[i].ai.threaded = email.folder || 'NOT_LOCAL'
            Vue.set(this.inbox.emails, i, this.inbox.emails[i])
            if (email?.parsed?.thread?.messages) { replies.push(...[email, ...email?.parsed?.thread?.messages]) }
            replies.push(email)
          }
        }

        // search board
        for (const board of this.boardNames) {
          for (let i = 0; i < this.boards[board].emails.length; i++) {
            const email = this.boards[board].emails[i]
            if (!message_ids.has(email.envelope['message-id']) && email.envelope['message-id'] == reply_id || (bySubject && email?.ai?.cleanSubject == subject && mid != email.envelope['message-id'])) {
              // emails in the future can't be valid historical messages
              const threaded_date = new Date(email?.envelope?.date)
              if (threaded_date > date) continue;
              // log("Had email in a board.")
              this.boards[board].emails[i].ai.threaded = email.folder || 'NOT_LOCAL'
              if (email?.parsed?.thread?.messages) { replies.push(...[email, ...email?.parsed?.thread?.messages]) }
              replies.push(email)
            }
          }
        }

        // search done
        for (let i = 0; i < this.done.emails.length; i++) {
          const email = this.done.emails[i]
          if (!message_ids.has(email.envelope['message-id']) && email.envelope['message-id'] == reply_id || (bySubject && email?.ai?.cleanSubject == subject && mid != email.envelope['message-id'])) {
            // emails in the future can't be valid historical messages
            const threaded_date = new Date(email?.envelope?.date)
            if (threaded_date > date) continue;
            // log("Had email in done.")
            this.done.emails[i].ai.threaded = email.folder || 'NOT_LOCAL'
            Vue.set(this.done.emails, i, this.done.emails[i])
            if (email?.parsed?.thread?.messages) { replies.push(...[email, ...email?.parsed?.thread?.messages]) }
            replies.push(email)
          }
        }

        // TODO: check sent trash etc folders locally

        // if it has no replies we are already done, as there is nothing to search server for
        if (!reply_id) return replies


        // TODO: check references > check reply id

        // search server
        const search_results = (await this.callIPC(
          this.task_SearchEmails(app.folderNames.archive, {
            header: [
              'Message-ID', reply_id
            ]
          })
        )).map(uid => {return {uid, folder: app.folderNames.archive}})
        if (this.imapConfig.provider != 'google') {
          search_results.push(...(await this.callIPC(
            this.task_SearchEmails(app.folderNames.sent, {
              header: [
                'Message-ID', reply_id
              ]
            })
          )).map(uid => {return {uid, folder: app.folderNames.sent}}))
          search_results.push(...(await this.callIPC(
            this.task_SearchEmails(app.folderNames.inbox, {
              header: [
                'Message-ID', reply_id
              ]
            })
          )).map(uid => {return {uid, folder: app.folderNames.inbox}}))
        }
        if (search_results.length > 0) {
          // log("Found email on server.")
          const { uid, folder } = search_results[0]
          const email = await this.callIPC(this.task_FetchEmails(
            folder, uid, true
          ))
          if (email.length > 0) replies.push(...await MailCleaner.peek(folder, email))
          else error(...MAILAPI_TAG, "Couldn't fetch email after getting it from server!")
        }

        // otherwise we give up
        // log("Couldn't find email", reply_id)
        return replies
      }

      // takes an email and puts its replies into the thread
      // recursively calls itself to exhaust the thread
      // is a command, not a query! does not return val!
      const threading = async email => {
        iterations++
        const replies = await find_replies(email, bySubject=true)
        thread.push(...replies)
        // we don't want to do this async
        // to avoid computing multiples
        for (const reply of replies) {
          message_ids.add(reply.envelope['message-id'])
        }
        for (const reply of replies) {
          await threading(reply)
        }
      }

      await threading(email)

      // now, we remove any duplicates from the thread
      const thread_ids = new Set()
      const final_thread = []
      // log("Cleaning thread")
      for (const email of thread) {
        if (email.length) return error(...MAILAPI_TAG, 'Array is not fully flattened!')
        // kill the parsed of the thread
        // while searched emails are peeked,
        // emails that we had locally aren't
        // we need to make sure they get peeked :)
        if (!(thread_ids.has(email.envelope['message-id']))) {
          // log("Peeking email.")
          const peeked_email = Object.assign({}, email)
          // we don't need a deep clone because parsed is
          // a 1st level property
          // so we treat it like its a shallow property :)
          peeked_email.parsed = null
          // and now we can afford a deep clone
          // as parsed is finally gone
          // log("Cloning email.")
          const cleaned_email = JSON.parse(JSON.stringify(peeked_email))
          // and finally, push it onto the main thread
          final_thread.push(cleaned_email)
        }
        thread_ids.add(email.envelope['message-id'])
      }
      // TODO: sort thread by date

      // we add some metadata to our returned structure :)
      const getSender = email => {
        return email?.envelope?.from?.[0]?.name?.split(/, ?/)?.last() || email?.envelope?.from?.[0]?.address || ''
      }

      return { messages: final_thread, senders: [...new Set(thread.map(getSender))] }
    },
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
        if (reply_id) {
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
          if (reply_id) {
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
        if (reply_id) {
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

        const sync = async () => {
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
          if (!destSeqSet) return error(...MAILAPI_TAG, "Couldn't get destination UID", d, email)
          // TODO: should probably move it back if we failed
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

        setTimeout(sync, SYNC_TIMEOUT)
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