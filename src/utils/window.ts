import autoBind from 'auto-bind'
import { ipcMain, shell, powerMonitor, BrowserWindow } from 'electron'
import { Logger, LumberjackEmployer } from '../../Mouseion/utils/logger'
import SecureCommunications from './comms'

export default class WindowManager {
  private fullscreened: boolean = false
  private readonly Log: Logger

  constructor(
    Lumberjack: LumberjackEmployer,
    private win: BrowserWindow,
    private readonly hash='',
  ) {
    const _this = this
    this.Log = Lumberjack("Window Manager #" + hash)
    this.handler("minimize window", () => _this.win.minimize())
    this.handler("maximize window", () => _this.win.maximize())
    this.handler("unmaximize window", () => _this.win.unmaximize())
    this.handler("fullscreen window", () => _this.win.setFullScreen(true))
    this.handler("close window", () => _this.win.close())
    this.handler("hide window", () => _this.win.hide())

    autoBind(this)
  }

  private handler(action, cb) {
    SecureCommunications.registerBasic(this.hash + ': please ' + action, _ => {
      cb()
      return true
    })
  }

  set window(win: BrowserWindow) {
    this.win = win
    this.addListeners()
  }

  get window() {
    return this.win
  }

  private addListeners() {
    if (!(this.win)) throw "No window."
    const _this = this

    const updateFullscreenStatus = (status: boolean) => {
      _this.win.webContents.send(_this.hash + ': please fullscreen status changed', status)
      _this.fullscreened = status
    }
    const updateMaximizedStatus = (status: boolean) => {
      _this.win.webContents.send(_this.hash + ': please maximized status changed', status)
    }

    this.win.on("enter-full-screen", () => updateFullscreenStatus(true))
    this.win.on("enter-html-full-screen", () => updateFullscreenStatus(true))
    this.win.on("leave-full-screen", () => updateFullscreenStatus(false))
    this.win.on("leave-html-full-screen", () => updateFullscreenStatus(false))

    this.win.on("maximize", () => updateMaximizedStatus(true))
    this.win.on("unmaximize", () => updateMaximizedStatus(false))

    powerMonitor.on("resume", () => {
      try {
        _this.win.reload()
      } catch (e) {
        _this.Log.error(e)
      }
    })

    this.win.webContents.on("new-window", (event, url) => {
      event.preventDefault()
      shell.openExternal(url)
    })

    ipcMain.removeHandler(this.hash + ": please get fullscreen status")
    this.handler("get fullscreen status", () => updateFullscreenStatus(_this.fullscreened))
  }
}