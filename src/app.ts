/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? We use Sentry for security.
//! Sentry should be the first thing to load in the entire app.
// TODO: should also track environment
// TODO: bug reports, managed updates, etc. for electron
import Sentry from '@sentry/electron'
Sentry.init({ dsn: "https://611b04549c774cf18a3cf72636dba7cb@o342681.ingest.sentry.io/5560104" });

//? Create our Registry for global state
import Register from '../Mouseion/managers/register'
const Registry = new Register()

//? Spawn a new Forest to use for the Main process's logs
import Forest from '../Mouseion/utils/logger'
const forest = new Forest("logs-main-process")
const Lumberjack = forest.Lumberjack
Registry.register("Lumberjack", Lumberjack)
const Log = Lumberjack("App")

// TODO: cleanup
import os from 'os'
import { app, BrowserWindow, ipcMain } from 'electron'
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Communications
import SecureCommunications from './utils/comms'

const comms = await SecureCommunications.init()
Registry.register("Communications", comms)
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Various "session" variables
import child_process from 'child_process'

let commit_hash: string, dev: boolean
try {
  commit_hash = child_process
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
Registry.register("commit hash", commit_hash)
Registry.register("dev flag", dev)
Registry.register("user agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4101.0 Safari/537.36 Edg/83.0.474.0")
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////



/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? OAuth modules handle servicing OAuth requests
Log.log("Initializing OAuth modules.")
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
import GOAuth from './oauth/google'
import MSOAuth from './oauth/msft'

const goauth = new GOAuth(
  Registry,
  '446179098641-5cafrt7dl4rsqtvi5tjccqrbknurtr7k.apps.googleusercontent.com',
  undefined, //! no client secret: register it as an iOS app
  ['https://mail.google.com']
)
Registry.register("Google OAuth", goauth)
const msoauth = new MSOAuth(
  Registry,
  '65b77461-4950-4abb-b571-ad129d9923a3',
  '8154fffe-1ce5-4712-aea5-077fdcd97b9c'
)
Registry.register("Microsoft OAuth", msoauth)
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Email modules that enable IMAP/SMTP
Log.log("Building IMAP/SMTP modules.")
import CarrierPigeon from './mail/smtp'
import Mailman from './mail/imap'

const carrierPigeon = new CarrierPigeon(Registry)
Registry.register("Carrier Pigeon", carrierPigeon)
const mailman = new Mailman(Registry)
Registry.register("Mailman", mailman)
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Caches, preferences, storage
Log.log("Building cache modules.")
import DwarfStar from './cache/dwarf-star'
import GasGiant from './cache/gas-giant'

const dwarfStar = new DwarfStar("dwarf-star.json")
Registry.register("Dwarf Star", dwarfStar)
const gasGiant = new GasGiant("gas-giant")
Registry.register("Gas Giant", gasGiant)
//? Load preferences
dwarfStar.reset()
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Window controls for the main window
Log.log("Initializing Window Manager.")
import WindowManager from './utils/window-manager'

const windowManager = new WindowManager(
  Registry,
  WindowManager.newWindow({}),
  "INBOX"
)
Registry.register("Window Manager", windowManager)
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Other windows in component form
Log.log("Initializing secondary components.")
import Composer from './components/composer'
import Calendar from './components/calendar'

const composer = new Composer(Registry)
Registry.register("Composer", composer)
const calendar = new Calendar(Registry)
Registry.register("Calendar", calendar)
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? App Manager tool that handles updates
Log.log("Initializing App Manager.")
import AppManager from './utils/app-manager'

const appManager = new AppManager(Registry, dev ? "Dev" : "Stable")
Registry.register("App Manager", appManager)
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Entry script for the main window
const GLOBAL_DISABLE_AUTH=true //! FIXME: DISABLE THIS IN PROD!!!!!!!!!!

const entry = (disable_auth=GLOBAL_DISABLE_AUTH) => {
  const signed_in = dwarfStar.settings.auth.authenticated

  if (signed_in || disable_auth) {
    Log.success("User is signed in, loading their inbox.")
    //! FIXME: before deployment, remove commit_hash from url below
    windowManager.loadURL(`file://${__dirname}/public/index.html#${commit_hash}`)
  } else {
    Log.warn("User is not signed in, loading the signin flow.")
    windowManager.loadURL("https://helloaiko.com/email/signin")
  }
}

SecureCommunications.registerBasic('reentry', () => entry())
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Initialization script for launching the main window

//? Adblock to block email trackers
import { ElectronBlocker } from '@cliqz/adblocker-electron'
//? Fetch tooling for requests
import fetch from 'cross-fetch'

const init = async () => {
  const SentinelAdblock = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)

  windowManager.window = WindowManager.newWindow({})
  windowManager.window.maximize()
  windowManager.window.show()
  windowManager.window.focus()

  entry()

  SentinelAdblock.enableBlockingInSession(windowManager.window.webContents.session)
  windowManager.window.on("closed", () => {
    windowManager.window.close()
  })
}
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? App Lifecycle Hooks
app.allowRendererProcessReuse = false

app.on("ready", init)

app.on("window-all-closed", () => {
  // TODO: live on in the tray
  if (process.platform !== 'darwin') app.quit()
})

app.on("activate", () => windowManager.window.focus())
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Finalize exports
export const platform = process.platform
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Check for updates
if (!dev) appManager.checkForUpdates()
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////