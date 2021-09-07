import SecureCommunications from '../utils/comms'
import WindowManager from '../utils/window-manager'
import Register from '../../Mouseion/managers/register'
import autoBind from 'auto-bind'

export default class Composer {
  private readonly comms: SecureCommunications

  constructor(
    private readonly Registry: Register,
  ) {
    this.comms = Registry.get("Inbox Communications") as SecureCommunications

    this.comms.register("please open the composer", this.open)

    autoBind(this)
  }

  private open({bang}: {bang: string}) {
    const win = WindowManager.newWindow({
      height: 600, width: 800
    })

    const windowManager = new WindowManager(this.Registry, win, 'composer-' + bang)
    windowManager.window = win

    win.loadURL(`file://${__dirname}/../../public/compose.html#${bang}`, {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4101.0 Safari/537.36 Edg/83.0.474.0'
    })

    win.show()
    win.focus()

    return {bang,}
  }

}