/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
// FIXME: remove this code BEFORE deployment
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
// versioning for debugging
let commit_hash
let dev = false
try {
  commit_hash = require('child_process')
    .execSync('git rev-parse HEAD')
    .toString().trim()
  dev = true
} catch (e) {
  commit_hash = null
  dev = false
}
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////

/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
// Utilities
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
const Sentry = require('@sentry/electron')
// TODO: should also track environment
// TODO: bug reports, managed updates, etc. for electron
Sentry.init({ dsn: "https://611b04549c774cf18a3cf72636dba7cb@o342681.ingest.sentry.io/5560104" });
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////

/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
// Logger :)
// TODO: upgrade to Aiko Lumberjack
const Log = require('./src/js/utils/logger')
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////

/// //////////////////////////////////////////////////////
// Startup
/// //////////////////////////////////////////////////////
Log.log('Starting up')
const os = require('os')
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { autoUpdater } = require("electron-updater")
//? checks to make sure we're not in the midst of installation
if (require('electron-squirrel-startup')) app.quit()
//? check for updates
autoUpdater.on('error', Log.error)
autoUpdater.on('checking-for-update', () => Log.log('Checking for updates...'))
autoUpdater.on('update-available', () => Log.log('Update is available, downloading...'))
autoUpdater.on('update-not-available', () => Log.success('App is up to date.'))
autoUpdater.on('update-downloaded', () => Log.success('Downloaded update.'))

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  dialog.showMessageBox(window, {
    type: 'question',
    buttons: ['Update', 'Later'],
    defaultId: 0,
    message: `An update to Aiko Mail is available. Updates contain important security updates, vital bug fixes and new features.`,
    title: 'Update Available'
  }, response => {
    if (response === 0) {
      autoUpdater.quitAndInstall()
    }
  })
})

const platform = os.platform() + '_' + os.arch()
const version = app.getVersion()

// TODO: remove before deployment
if (!dev) commit_hash = platform + '-' + version + ': NOT FOR RELEASE!'

const updateFeed = (() => {
  const server = "https://aiko-mail-update-service.vercel.app"
  return `${server}/update/${process.platform}/${version}`
})()
Log.log("Fetches updates from", updateFeed)
autoUpdater.setFeedURL(updateFeed)

if (!dev) setInterval(autoUpdater.checkForUpdates, 5 * 60 * 1000)


/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////

/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
// Set up OAuth clients
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//! gmail uses self signed certs :(
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const GOAuth = require('./src/js/oauth/goauth')
const MSAuth = require('./src/js/oauth/msoauth')

Log.log('Setting up GOauth')
GOAuth(
  '446179098641-5cafrt7dl4rsqtvi5tjccqrbknurtr7k.apps.googleusercontent.com',
  null, // no client secret if you registered as iOS app!
  ['https://mail.google.com']
)

Log.log('Setting up MSOauth')
MSAuth(
  '65b77461-4950-4abb-b571-ad129d9923a3',
  '8154fffe-1ce5-4712-aea5-077fdcd97b9c'
)
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////

/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
// Require mailing tools
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
Log.log('Setting up email engine IPC')
const CarrierPigeon = require('./src/js/mail/email')
Log.log('Setting up SMTP...')
const Mailman = require('./src/js/mail/sendmail')
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////

/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
// Set up cache
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
Log.log('Setting up preferences IPC')
const Prefs = require('./src/js/cache/prefs')('prefs.json')
Log.log('Loading preferences...')
Prefs.set(Prefs.load())
Log.log('Building cache...')
const BigBoi = require('./src/js/cache/big-boi-cache')('cache')
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////

/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
// Window Controls
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
// Controls the windows of our app :)
let win
Log.log('Setting up window controls')
const WindowManager = require('./src/js/utils/window')(win)

// Components and side windows of our app
const Composer = require('./src/js/components/composer')
const Calendar = require('./src/js/components/calendar')
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////

/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
// Define entry scripts
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
const entry = () => {
  const signed_in = Prefs.data.authenticated

  if (signed_in) {
    Log.log('User is signed in, loading the main app.')
    // FIXME: before deployment, remove commit_hash from url below
    win.loadURL(`file://${__dirname}/src/public/index.html#${commit_hash}`, {
      // have to pretend to be Chrome to pass OAuth
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4101.0 Safari/537.36 Edg/83.0.474.0'
    })
  } else {
    Log.log('User is not signed in, they will go thru the signin flow.')
    win.loadURL('https://helloaiko.com/email/signin', {
      userAgent: 'Aiko Mail'
    })
  }
}
ipcMain.handle('reentry', (_, __) => entry())
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////

/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
// Define launch scripts
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
const init = async () => {
  win = new BrowserWindow({
    show: false,
    frame: process.platform == 'darwin',
    titleBarStyle: 'hidden',
    backgroundColor: '#312f2e',
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true
      // FIXME: while this is enabled we have to be 1000% sure that
      // we are in no way shape or form loading scripts from any
      // external or unsafe source. However, disabling this will
      // totally and irreversibly cripple our IPC.

      // If you are coming across this on an audit please don't remove
      // it, as instead we have opted to ensure we aren't loading any
      // external scripts. It's a bit of a compromise we are forced to
      // make in order to make use of TCP sockets on the backend.
      // see: https://www.electronjs.org/docs/tutorial/security#3-enable-context-isolation-for-remote-content
      // Without this we would have to use IPC through preload which is
      // just as if not more so insecure :)

      // Our only other alternative is to run a local web server with
      // websockets from the backend and communicate in that manner.
      // We have elected not to do this, but if this option is fully
      // a pressing issue at the time of your audit, that would be our
      // alternative course of action.
    },
    // TODO: icon
    icon: process.platform == 'darwin' ? './src/public/assets/img/icon.png' : './src/public/assets/img/app-icon/square-icon-shadow.png'
  })
  WindowManager.setWindow(win)
  win.maximize()
  win.show()
  win.focus()

  entry()

  win.on('closed', () => {
    win = null
    WindowManager.setWindow(null)
  })
}
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////

/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
// LAUNCH TIME 🚀🚀🚀🚀🚀🚀
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
app.allowRendererProcessReuse = false
app.on('ready', init)

app.on('window-all-closed', () => {
  // TODO: live on in the tray
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (win === null) init()
})
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////

/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
// Some useful variables
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
module.exports = {
  platform: process.platform
}
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////