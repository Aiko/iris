/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? We use Sentry for security.
//! Sentry should be the first thing to load in the entire app.
// TODO: should also track environment
// TODO: bug reports, managed updates, etc. for electron
const Sentry = require('@sentry/electron')
Sentry.init({ dsn: "https://611b04549c774cf18a3cf72636dba7cb@o342681.ingest.sentry.io/5560104" });

//? Spawn a new Forest to use for the Main process's logs
const Forest = require('./Mouseion/dist/utils/logger').default
const forest = new Forest("logs-main-process")
const Lumberjack = forest.Lumberjack
const Log = Lumberjack("App")

const os = require('os')
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Version identifier using commit
let commit_hash, dev
try {
  commit_hash = require('child_process')
                  .execSync("git rev-parse HEAD")
                  .toString()
                  .trim()
  dev = true
  Log.warn("Developer mode ON - commit #", commit_hash)
} catch (e) {
  //! FIXME: remove before deployment
  commit_hash = os.platform() + '-' + app.getVersion() + ': NOT FOR RELEASE!'
  dev = false
  Log.log("Developer mode OFF. Performance will reflect production.")
}

//? App Manager tool that handles updates
const AppManager = require('./src/utils/app-management')(Lumberjack, dev ? "Dev" : "Stable")
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////



/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? OAuth modules handle servicing OAuth requests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
Log.log("Building OAuth modules.")
const GOAuth = require('./src/oauth/goauth')
const MSOAuth = require('./src/oauth/msoauth')

Log.log("Initializing OAuth modules.")
GOAuth(
  '446179098641-5cafrt7dl4rsqtvi5tjccqrbknurtr7k.apps.googleusercontent.com',
  null, //! no client secret: register it as an iOS app
  ['https://mail.google.com']
)
MSOAuth(
  '65b77461-4950-4abb-b571-ad129d9923a3',
  '8154fffe-1ce5-4712-aea5-077fdcd97b9c'
)
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Email modules that enable IMAP/SMTP
Log.log("Building IMAP/SMTP modules.")
const CarrierPigeon = require('./src/mail/email')
const Mailman = require('./src/mail/sendmail')
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Caches, preferences, storage
Log.log("Building cache modules.")
const Prefs = require('./src/cache/prefs')('prefs.json')
const BigBoi = require('./src/cache/big-boi-cache')('cache')
//? Load preferences
Prefs.set(Prefs.load())
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Window controls for the main window
let win //! our main window tool
const WindowManager = require('./src/utils/window')(win)

//? Components that spawn side windows receive their own window controls
const ComposerManager = require('./src/components/composer')
const Calendar = require('./src/components/calendar')
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Entry script for the main window
const GLOBAL_DISABLE_AUTH=true
const entry = (disable_auth=GLOBAL_DISABLE_AUTH) => {
  const signed_in = Prefs.data.authenticated

  if (signed_in || disable_auth) {
    Log.success("User is signed in, loading their inbox.")
    //! FIXME: before deployment, remove commit_hash from url below
    win.loadURL(`file://${__dirname}/public/index.html#${commit_hash}`, {
      //? have to pretend to be Chrome to pass OAuth
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4101.0 Safari/537.36 Edg/83.0.474.0'
    })
  } else {
    Log.warn("User is not signed in, loading the signin flow.")
    win.loadURL("https://helloaiko.com/email/signin", {
      userAgent: 'Aiko Mail'
    })
  }
}

ipcMain.handle('reentry', () => entry())
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Initialization script for launching the main window

//? Adblock to block email trackers
const { ElectronBlocker } = require('@cliqz/adblocker-electron')
//? Fetch tooling for requests
const fetch = require('cross-fetch')

const init = async () => {
  const SentinelAdblock = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)

  win = new BrowserWindow({
    show: false, //? don't show it until after we load window controls
    frame: process.platform == 'darwin', //? frameless on windows
    titleBarStyle: "hidden",
    backgroundColor: "#312f2e", //? background for the app
    webPreferences: {
      enableRemoteModule: true, //! FIXME: you know this is bad...
      nodeIntegration: true, //! FIXME: migrate fully to websockets
    },
    icon: process.platform == 'darwin' ? './public/assets/img/icon.png' : './public/assets/img/app-icon/square-icon-shadow.png'
  })
  WindowManager.setWindow(win)
  win.maximize()
  win.show()
  win.focus()

  entry()

  SentinelAdblock.enableBlockingInSession(win.webContents.session)
  win.on("closed", () => {
    win = null
    WindowManager.setWindow(null)
  })
}
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////


//! TODO: refactor below this line


/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
app.allowRendererProcessReuse = false
app.on("ready", init)

app.on("window-all-closed", () => {
  // TODO: live on in the tray
  if (process.platform !== 'darwin') app.quit()
})

app.on("activate", () => {
  if (win === null) init()
})
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
module.exports = {
  platform: process.platform
}

if (!dev) AppManager.checkForUpdates()
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////