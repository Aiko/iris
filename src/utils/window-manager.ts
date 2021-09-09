import autoBind from 'auto-bind'
import { ipcMain, shell, powerMonitor, BrowserWindow } from 'electron'
import { Logger, LumberjackEmployer } from '../../Mouseion/utils/logger'
import Register from '../../Mouseion/managers/register'
import SecureCommunications from './comms'

export default class WindowManager {
  private fullscreened: boolean = false
  private readonly Log: Logger

  constructor(
    private readonly Registry: Register,
    private win: BrowserWindow | null,
    private readonly hash='',
  ) {
    const _this = this
    const Lumberjack = Registry.get("Lumberjack") as LumberjackEmployer
    this.Log = Lumberjack("Window Manager #" + hash)
    this.handler("minimize window", () => _this.minimize())
    this.handler("maximize window", () => _this.maximize())
    this.handler("unmaximize window", () => _this.unmaximize())
    this.handler("fullscreen window", () => _this.setFullScreen(true))
    this.handler("close window", () => _this.close())
    this.handler("hide window", () => _this.hide())

    autoBind(this)
  }

  private handler(action: string, cb: any) {
    SecureCommunications.registerBasic(this.hash + ': please ' + action, (_: any) => {
      cb()
      return true
    })
  }

  maximize() { if (this.win) this.win.maximize() }
  unmaximize() { if (this.win) this.win.unmaximize() }
  minimize() { if (this.win) this.win.minimize() }
  setFullScreen(s: boolean) { if (this.win) this.win.setFullScreen(s) }
  close() { if (this.win) this.win.close() }
  hide() { if (this.win) this.win.hide() }
  focus() { if (this.win) this.win.focus() }

  set window(win: BrowserWindow | null) {
    this.win = win
    this.addListeners()
  }

  get window() {
    if (!this.win) return null;
    return this.win
  }

  loadURL(url: string, args?: Electron.LoadURLOptions) {
    if (!this.win) throw "Window has not been set. Cannot load URL."
    this.win.loadURL(url, {
      userAgent: this.Registry.get("user agent"),
      ...args
    })
  }

  private addListeners() {
    if (!(this.win)) throw "No window."
    const _this = this

    const updateFullscreenStatus = (status: boolean) => {
      if (_this.win) {
        _this.win.webContents.send(_this.hash + ': please fullscreen status changed', status)
        _this.fullscreened = status
      }
    }
    const updateMaximizedStatus = (status: boolean) => {
      if (_this.win) {
        _this.win.webContents.send(_this.hash + ': please maximized status changed', status)
      }
    }

    this.win.on("enter-full-screen", () => updateFullscreenStatus(true))
    this.win.on("enter-html-full-screen", () => updateFullscreenStatus(true))
    this.win.on("leave-full-screen", () => updateFullscreenStatus(false))
    this.win.on("leave-html-full-screen", () => updateFullscreenStatus(false))

    this.win.on("maximize", () => updateMaximizedStatus(true))
    this.win.on("unmaximize", () => updateMaximizedStatus(false))

    powerMonitor.on("resume", () => {
      try {
        if (_this.win) _this.win.reload()
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

  static newWindow(args: Partial<Electron.BrowserWindowConstructorOptions>) {
    return new BrowserWindow({
      show: false,
      frame: process.platform == 'darwin',
      titleBarStyle: 'hidden',
      backgroundColor: '#312f2e',
      webPreferences: {
        enableRemoteModule: true, //! FIXME: you know this is bad...
        nodeIntegration: true, //! FIXME: migrate fully to websockets
      },
      icon: process.platform == 'darwin' ? './public/assets/img/icon.png' : './public/assets/img/app-icon/square-icon-shadow.png',
      ...args
    })
  }
}