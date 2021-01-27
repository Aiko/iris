const fs2 = require('fs-extra')
const path = require('path')

const batchMap = require('../utils/do-in-batch')
const Storage = require('../utils/storage')
const Lock = require('../utils/promise-lock')

const Cache = require('./db/client')
const PostOffice = require('./imap/client')

const FolderEngine = require('./email/folders')
const ContactEngine = require('./email/contacts')()
const BoardRuleEngine = require('./email/board-rules')()
const SyncEngine = require('./email/sync')()

const Operator = require('./email/operator')
const API = require('./email-api')

//* probably need to store emails in a separate database
//* would need to track inbox UID, current folder/UID, etc everything that is in aiko mail

// TODO: check capabilities of server
// TODO: test connection and credentials first
// TODO: error handlers for everything below so that nothing can fuck up the engine :)


//* NOTE: Mailbox is async. You should await the result to get bindings out.
const Mailbox = (async (Lumberjack, {
  host, port, user, pass, oauth, secure, //* config
  provider="other" //? defaults to other but accepts google, microsoft, etc
}, {
  SYNC_TIMEOUT=30*1000,
  SYNC_BATCH_SIZE=4,
  THREAD_BATCH_SIZE=100,
  AI_BATCH_SIZE=500,
} ={}, onSync=() => true) => {
  const Log = Lumberjack('Mailbox')
  let trigger = _ => _

  //* storage directory
  let dir = user.replace(/[^A-z\.0-9]/gim, '')
  switch (process.platform) {
    case 'darwin': dir = path.join(process.env.HOME, 'Library', 'Application Support', 'Aiko Mail', 'Mouseion', dir); break
    case 'win32': dir = path.join(process.env.APPDATA, 'Aiko Mail', 'Mouseion', dir); break
    case 'linux': dir = path.join(process.env.HOME, '.Aiko Mail', 'Mouseion', dir); break
  }

  Log.log("Mailbox initialized in", dir)

  //* Config cache
  const configs = Storage(path.join(dir, '/configs'))
  Log.log("Instantiated configuration cache")
  if (!configs.load("cursor")) configs.store('cursor', 0)

  //* L1, L2, L3 caches & message DB
  const cache = await Cache(Lumberjack, dir)
  Log.log("Instantiated cache provider")

  //* IMAP bindings
  // TODO: you can make a pool of IMAP workers and use that to sync multiple folders at once
  const courier = PostOffice(Lumberjack)
  const connected = await courier.network.connect(
    host, port, user, pass, oauth, secure
  ).catch(Log.error)
  if (!connected) return Log.error("Credentials incorrect.")
  Log.success("Established connection to mailserver")

  //* Folder sync-list and Cleaner cache
  const syncedFolders = new Set()
  const syncFolders = (...folders) => {
    folders.filter(_ => _).map(f => syncedFolders.add(f))
    Log.success("Now syncing:", syncedFolders)
  }
  const unsyncFolders = (...folders) => {
    folders.filter(_ => _).map(f => syncedFolders.delete(f))
    Log.success("Now syncing:", syncedFolders)
  }
  const Cleaners = {}

  //* Named Folders
  const FolderManager = await FolderEngine(provider, courier, Log)
  Log.success("Fetched folders")

  //* Contact sync
  const Contacts = ContactEngine(user, cache, FolderManager, Log)

  //* Board rules
  const Cypher = Operator(provider,
    FolderManager,
    configs,
    cache, courier,
    Contacts, null,
    Cleaners, Log, Lumberjack) //? Cypher is a stripped down operator (no board rules)
  const BoardRules = BoardRuleEngine(configs, cache, FolderManager, Cypher)

  //* Single Folder Sync
  const MailSync = SyncEngine(
    provider,
    Contacts, BoardRules,
    cache, courier,
    Cleaners, Log,
    configs,
    Lumberjack, FolderManager,
    AI_BATCH_SIZE)

  //* Client Operator
  const Link = Operator(provider,
    FolderManager,
    configs,
    cache, courier,
    Contacts, BoardRules,
    Cleaners, Log, Lumberjack, auto_increment_cursor=true)

  //* Sync Lifecycle

  const beforeSync = async () => {
    await courier.network.checkConnect()
    trigger('sync-started')
  }

  const afterSync = async () => {
    await Contacts.sync()
    await BoardRules.apply()
    Log.success("Finished sync.")
    trigger('sync-finished')
    onSync()
  }

  //? helper tools for sync
  let nextSync = null
  const SyncLock = Lock()
  //? Calling this will clear any timeouts, do an immediate sync,
  //? and then sync every 30s after that
  //? This uses a lock so only one sync op can run at once
  //? You can await the result to know when it is finished running
  const syncAll = () =>
    SyncLock.acquire(async () => {
      if (nextSync) {
        clearTimeout(nextSync)
        nextSync = null
      }
      try {
        await beforeSync()
        await batchMap(syncedFolders, SYNC_BATCH_SIZE, MailSync)
        await afterSync()
      } catch (e) {
        Log.error(e)
      }
      nextSync = setTimeout(syncAll, SYNC_TIMEOUT)
    })
  ;;

  const api = API(cache, courier, FolderManager, Cleaners, Link, AI_BATCH_SIZE)

  //! TODO: need a way to update the OAuth tokens while the engine is running. Like some way to safely
  //! update the courier -- maybe a quick close-connect pairing called from the checkOAuthTokens thing in client
  //! should test that extensively: set the expiry date behind, call checkOAuthTokens mid-engine-sync and see!
  //! but the app has a backendSyncing var, you can use that to wait to update tokens

  return {
    syncSet: {
      add: syncFolders, remove: unsyncFolders
    },
    sync: {
      immediate: syncAll,
    },
    contacts: {
      lookup: Contacts.lookup,
    },
    api,
    FolderManager,
    close: async () => {
      await courier.network.close()
      return true
    },
    registerTrigger: t => (trigger = t)
  }
})

module.exports = Mailbox
