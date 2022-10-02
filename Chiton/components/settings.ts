import type SecureCommunications from '@Chiton/utils/comms'
import WindowManager from '@Chiton/utils/window-manager'
import type Register from '@Mouseion/managers/register'
import autoBind from 'auto-bind'
import type { BrowserWindow } from 'electron'

export default class Settings {
  private readonly comms: SecureCommunications
  lock: BrowserWindow | null = null
  private readonly windowManager: WindowManager

  constructor(
    private readonly Registry: Register,
  ) {
    this.comms = Registry.get("Communications") as SecureCommunications
    this.windowManager = Registry.get("Window Manager") as WindowManager

    this.comms.register("please open settings", this.open.bind(this))

    autoBind(this)
  }

  private open({bang}: {bang: string}) {
    if (this.lock) {
      this.lock.show()
      this.lock.focus()
      return
    }

    const win = WindowManager.newWindow({
      width: this.windowManager.window?.getBounds().width || 800,
      height: this.windowManager.window?.getBounds().height || 600
    })
    if (this.windowManager.window?.isFullScreen()) win.setFullScreen(true)
    this.lock = win

    const windowManager = new WindowManager(this.Registry, win, 'settings-' + bang)
    windowManager.window = win

    windowManager.loadURL(`file://${__dirname}/../../../public/settings.html#${bang}`)

    win.show()
    win.focus()
    const _this = this
    win.on("closed", () => _this.lock = null)

    return {bang,}
  }

}