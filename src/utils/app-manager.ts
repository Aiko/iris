import os from 'os'
import { app, autoUpdater, dialog } from 'electron'
import { Logger, LumberjackEmployer } from '../../Mouseion/utils/logger'
import autoBind from 'auto-bind'
import Register from '../../Mouseion/managers/register'
import WindowManager from './window-manager'

export default class AppManager {
  private readonly Log: Logger
  private readonly platform: NodeJS.Platform
  private readonly version: string
  private feed: string
  private interval: NodeJS.Timer | null = null

  private readonly windowManager: WindowManager

  constructor(
    Registry: Register,
    private channel: string,
  ) {
    const Lumberjack = Registry.get("Lumberjack") as LumberjackEmployer
    this.Log = Lumberjack("App Manager")

    this.windowManager = Registry.get("Window Manager") as WindowManager

    if (require('electron-squirrel-startup')) {
      this.Log.error("App is being installed. Quitting to prevent unintended side effects.")
      app.quit()
      process.exit(0)
    }

    this.platform = os.platform()
    this.version = app.getVersion()

    const _this = this
    autoUpdater.on("error", _this.Log.error)
    autoUpdater.on("checking-for-update", () => _this.Log.log("Checking for updates..."))
    autoUpdater.on("update-not-available", () => _this.Log.success("App is up to date."))
    autoUpdater.on("update-downloaded", () => _this.Log.success("Downloaded update. Pending installation."))

    autoUpdater.on("update-downloaded", async (event, releaseNotes, releaseName) => {
      // TODO: replace w/ modal
      const ret = await dialog.showMessageBox(_this.windowManager.window!, {
        type: 'question',
        buttons: ['Update', 'Later'],
        defaultId: 0,
        message: `An update to Aiko Mail is available. Updates contain important security updates, vital bug fixes and new features.`,
        title: 'Update Available'
      })

      if (ret.response === 0) {
        autoUpdater.quitAndInstall()
      } else _this.Log.error(ret.response)
    })

    this.feed = "" // this.getFeedURL()

    autoBind(this)
  }

  private getFeedURL() {
    this.feed = `https://knidos.helloaiko.com/update/${this.channel}/${this.platform}/${this.version}`
    autoUpdater.setFeedURL({
      url: this.feed
    })
    return this.feed
  }

  public checkForUpdates() {
    this.feed = this.getFeedURL()
    autoUpdater.checkForUpdates()
    if (!(this.interval)) {
      this.interval = setInterval(autoUpdater.checkForUpdates, 5 * 60 * 1000)
    }
  }
}