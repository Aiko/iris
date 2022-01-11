/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Imports
import * as Sentry from '@sentry/electron'
//? We use Sentry for security.
//! Sentry should be the first thing to load in the entire app.
// TODO: should also track environment
// TODO: bug reports, managed updates, etc. for electron
Sentry.init({ dsn: "https://611b04549c774cf18a3cf72636dba7cb@o342681.ingest.sentry.io/5560104" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
import os from 'os'
import child_process from 'child_process'
import { app, session } from 'electron'
import Register from './Mouseion/managers/register'
import Forest from './Mouseion/utils/logger'
import SecureCommunications from './src/utils/comms'
import Roots from './src/utils/roots'
import WindowManager from './src/utils/window-manager'
import DwarfStar from './src/cache/dwarf-star'
import GasGiant from './src/cache/gas-giant'
import GOAuth from './src/oauth/google'
import MSOAuth from './src/oauth/msft'
import Mailman from './src/mail/imap'
import CarrierPigeon from './src/mail/smtp'
import Composer from './src/components/composer'
import Calendar from './src/components/calendar'
import AppManager from './src/utils/app-manager'

import { ElectronBlocker } from '@cliqz/adblocker-electron'
import fetch from 'cross-fetch'
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
;import Settings from './src/components/settings';
import CookieCutter from './src/cache/templates';
;(async () => { //! Don't remove this -- async function to use await below



/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Create our Registry for global state
const Registry = new Register()
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Communications
const comms = await SecureCommunications.init()
Registry.register("Communications", comms)
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////


/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Roots (for logging but at the highest level)
const roots = new Roots("logs-roots", Registry)
Registry.register("Roots", roots)
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////


/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Spawn a new Forest to use for the Main process's logs
const forest = new Forest("logs-main-process")
const Lumberjack = forest.Lumberjack
Registry.register("Lumberjack", Lumberjack)
const Log = Lumberjack("App")
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////


/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Various "session" variables
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
  commit_hash = os.platform() + '-' + app.getVersion() + ':INTERNAL'
  dev = false
  Log.log("Developer mode OFF. Performance will reflect production.")
}
Registry.register("commit hash", commit_hash)
Registry.register("dev flag", dev)
Registry.register("user agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36 Edg/93.0.961.52")
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Window controls for the main window
Log.log("Initializing Window Manager.")

const windowManager = new WindowManager(Registry, null, "INBOX", false)
Registry.register("Window Manager", windowManager)
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? OAuth modules handle servicing OAuth requests
Log.log("Initializing OAuth modules.")

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

const dwarfStar = new DwarfStar(Registry, "dwarf-star.json")
Registry.register("Dwarf Star", dwarfStar)
const gasGiant = new GasGiant(Registry, "gas-giant")
Registry.register("Gas Giant", gasGiant)
const cookieCutter = new CookieCutter(Registry, "cookie-cutter")
Registry.register("Cookie Cutter", cookieCutter)
//? Load preferences
dwarfStar.reset()
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Other windows in component form
Log.log("Initializing secondary components.")

const composer = new Composer(Registry)
Registry.register("Composer", composer)
const calendar = new Calendar(Registry)
Registry.register("Calendar", calendar)
const settings = new Settings(Registry)
Registry.register("Settings", settings)
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? App Manager tool that handles updates
Log.log("Initializing App Manager.")

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
    windowManager.loadURL(`file://${__dirname}/../public/index.html#${commit_hash}`)
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
//? Fetch tooling for requests

const init = async () => {

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders["User-Agent"] = Registry.get("user agent")
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  })

  const SentinelAdblock = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)

  windowManager.window = WindowManager.newWindow({})
  windowManager.window.maximize()
  windowManager.window.show()
  windowManager.window.focus()

  entry()

  SentinelAdblock.enableBlockingInSession(windowManager.window.webContents.session)
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

app.on("activate", () => windowManager.focus())
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Check for updates
if (!dev) appManager.checkForUpdates()
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
})() //! Don't remove this -- closing tag for async




/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////
//? Finalize exports
export const platform = process.platform
/// //////////////////////////////////////////////////////
/// //////////////////////////////////////////////////////