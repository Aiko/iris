import SecureCommunications from '../utils/comms'
import WindowManager from '../utils/window-manager'
import Register from '../../Mouseion/managers/register'
import autoBind from 'auto-bind'
import { BrowserWindow } from 'electron'

export default class Settings {
  private readonly comms: SecureCommunications
  lock: BrowserWindow | null = null

  constructor(
    private readonly Registry: Register,
  ) {
    this.comms = Registry.get("Communications") as SecureCommunications

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
      height: 600, width: 800
    })
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