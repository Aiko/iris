//* Mouseion IMAP Sync Engine
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

//* Logging
const Forest = require('./utils/logger')
const Lumberjack = Forest()

//* Mailbox
const Mailbox = require('./src/mailbox')
const commit_hash = require('child_process')
    .execSync('git rev-parse HEAD')
    .toString().trim()
;;

/*

Aiko Handshake
1. Call this with the websocket port of the main process + ID as args
2. This asks the websocket port of the main process to give it config
3. This starts engine, creates a websocket server, sends that port to main process
4. Main & renderer can comm with engine via WS

*/

(async () => {
  const Log = Lumberjack('Engine')
  Log.log("Setting up engine:", commit_hash)

  const mailbox = await Mailbox(Lumberjack, {
    host: "imap.1and1.com", port: 993,
    user: "ruben@priansh.com", pass: "blythe123$",
    secure: true
  }, {
    SYNC_TIMEOUT: 30 * 1000,
  })

  mailbox.syncFolders(
    mailbox.Folders.inbox,
    mailbox.Folders.sent,
    ...Object.values(mailbox.Folders.aiko),
  )
  mailbox.sync() //? begins syncing on interval

  //! TODO: trash and etc should be synced on-demand

})()
;;
