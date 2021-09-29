import SecureCommunications from '../utils/comms'
import WindowManager from '../utils/window-manager'
import Register from '../../Mouseion/managers/register'
import autoBind from 'auto-bind'
import { BrowserWindow } from 'electron'

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

  private open({bang}: {bang: string}) {
    if (this.lock) {
      this.lock.show()
      this.lock.focus()
      return
    }

    const mainWindowManager = this.Registry.get("Window Manager") as WindowManager

    const win = WindowManager.newWindow({
      width: mainWindowManager.window?.getBounds().width || 800,
      height: mainWindowManager.window?.getBounds().height || 600
    })
    if (mainWindowManager.window?.isFullScreen()) win.setFullScreen(true)
    this.lock = win

    this.windowManager = new WindowManager(this.Registry, win, 'calendar-' + bang)
    this.windowManager.window = win

    this.windowManager.loadURL(`file://${__dirname}/../../public/calendar.html#${bang}`)

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