import type SecureCommunications from '@Chiton/utils/comms'
import WindowManager from '@Chiton/utils/window-manager'
import type Register from '@Mouseion/managers/register'
import autoBind from 'auto-bind'
import type { BrowserWindow } from 'electron'

export default class Calendar {
  private readonly comms: SecureCommunications
  private windowManager: WindowManager | null = null
  lock: BrowserWindow | null = null

  constructor(
    private readonly Registry: Register,
  ) {
    this.comms = Registry.get("Communications") as SecureCommunications

    this.comms.register("please open the calendar", this.open.bind(this))

    autoBind(this)
  }

  private open({bang, provider}: {bang: string, provider: string}) {
    if (this.lock) {
      this.lock.show()
      this.lock.focus()
      return
    }

    const mainWindowManager = this.Registry.get("Window Manager") as WindowManager

    const win = WindowManager.newWindow({
      width: 800,
      height: 600,
      frame: true,
      titleBarStyle: "default"
    })
    if (mainWindowManager.window?.isFullScreen()) win.setFullScreen(true)
    this.lock = win

    this.windowManager = new WindowManager(this.Registry, win, 'calendar-' + bang)
    this.windowManager.window = win

    if (provider == 'outlook' || provider == 'exchange' || provider == 'microsoft') {
      this.windowManager.loadURL("https://outlook.office.com/calendar/")
      //this.windowManager.loadURL(`file://${__dirname}/../../public/calendar.html#${bang}`)
      win.webContents.insertCSS(`
      #app > div > div:nth-child(3) > div:nth-child(1) {
        display: none;
      }
      #app > div > div:nth-child(2) > div:nth-child(1) {
        display: none;
      }
      html[dir=ltr] .ms-Panel {
        left: 0px !important;
      }
      `)
      win.on("page-title-updated", () => {
        win.webContents.insertCSS(`
          #app > div > div:nth-child(3) > div:nth-child(1) {
            display: none;
          }
          #app > div > div:nth-child(2) > div:nth-child(1) {
            display: none;
          }
          html[dir=ltr] .ms-Panel {
            left: 0px !important;
          }
        `)
      })
    }
    else if (provider == 'google') {
      this.windowManager.loadURL("https://calendar.google.com/calendar/")
      win.webContents.insertCSS(`
      `)
      win.on("page-title-updated", () => {
        win.webContents.insertCSS(`
        `)
      })
    } else {
      this.windowManager.loadURL(`file://${__dirname}/../../public/calendar.html#${bang}`)
    }

    win.show()
    win.focus()
    const _this = this

    win.on("closed", () => {
      this.windowManager = null
      _this.lock = null
    })

    return {bang,}
  }

}