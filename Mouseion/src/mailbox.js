const fs2 = require('fs-extra')
const path = require('path')

const batchMap = require('../utils/do-in-batch')
const Storage = require('../utils/storage')

const Cache = require('./db/client')
const PostOffice = require('./imap/client')

const FolderEngine = require('./email/folders')
const ContactEngine = require('./email/contacts')()
const BoardRuleEngine = require('./email/board-rules')()
const SyncEngine = require('./email/sync')()
const Operator = require('./email/operator')

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

  //* storage directory
  let dir = user.replace(/[^A-z\.0-9]/gim, '')
  switch (process.platform) {
    case 'darwin': dir = path.join(process.env.HOME, 'Library', 'Application Support', 'Aiko Mail', 'Mouseion', dir); break
    case 'win31': dir = path.join(process.env.APPDATA, 'Aiko Mail', 'Mouseion', dir); break
    case 'linux': dir = path.join(process.env.HOME, '.Aiko Mail', 'Mouseion', dir); break
  }

  Log.log("Mailbox initialized in", dir)

  //* L1, L2, L3 caches & message DB
  const cache = await Cache(Lumberjack, dir)
  Log.log("Instantiated cache provider")

  //* Config cache
  const configs = Storage(path.join(dir, '/configs'))
  Log.log("Instantiated configuration cache")

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
  const Cleaners = {}

  //* Named Folders
  const FolderManager = await FolderEngine(provider, courier, Log)
  Log.success("Fetched folders")

  //* Contact sync
  const Contacts = ContactEngine(user, cache, FolderManager, Log)

  //* Board rules
  const Cypher = Operator(provider,
    FolderManager,
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
    Lumberjack, FolderManager,
    AI_BATCH_SIZE)

  const Link = Operator(provider,
    FolderManager,
    cache, courier,
    Contacts, BoardRules,
    Cleaners, Log, Lumberjack)

  //* sync lifecycle
  const syncAll = async () => {
    try {
      await courier.network.checkConnect()
      await batchMap(syncedFolders, SYNC_BATCH_SIZE, MailSync, async () => {
      })
      await Contacts.sync()
      await BoardRules.apply()
      Log.success("Finished sync!")
      onSync()
    } catch (e) {
      Log.error(e)
    }
    setTimeout(syncAll, SYNC_TIMEOUT)
  }

  //! TODO: API
  /* here are some features I think are worth adding to the API:

    !@awake priansh, here is my plan for api:
    - app opens, figures out which mailboxes are open
    - then, launches the engine for each mailbox (with config file or something)
    - then, the app asks for the newest X emails in each folder it has shown
      - for inbox, this should automatically exclude threads that are in other boards
      - it will be returned as a list of threads (tid and messages populated from mids)
      - it's the app's responsibility to ask for the unpeeked latest message
      - this is done on purpose to optimize!
    - the app should request updates on everything it has onsync (maybe pubsub this)
      - it should first ask for threads of everything
      - any thread that no lnoger exists can be spliced out
      - then anything that has changed (new tid, changed # of messages) should trigger update
        - this update should fetch the latest unpeeked message, and update the thread relevantly
    - the app needs to maintain a dictionary for what is currently syncing,
      and sets containing which UIDs it has in each folder
    - moving and copying needs a method written at this level
      - the app should make the move/copy in UI before its syncing (just use what we have now)
      - and then ask engine to sync, itll do that and everything will be ok
      - in the engine copy/move, it should cache the new location immediately
        and this should not trigger a new email websocket to the app!
        instead it should just tell the app that the move/copy op has been completed
      - if it fails, no big deal, move it back in the app
      - the reason its not a huge deal, is because if it DID work, then in next update
        the engine will find out its gone from the old folder and that its in the new one
  */

  //! TODO: rather than exposing anything, handle internally and instead expose a method to
  //! bind to some interface. so for example...
  //  const Mailbox = require('./mailbox')
  //  const API = ...
  //  Mailbox.bindTo(API)
  //! API should have a `register(channel: String, handler: Function)` method

  return {
    syncFolders,
    sync: syncAll,
    FolderManager,
    close: async () => {
      await courier.network.close()
      return true
    },
  }
})

module.exports = Mailbox
