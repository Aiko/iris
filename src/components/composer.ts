import SecureCommunications from '../utils/comms'
import WindowManager from '../utils/window-manager'
import Register from '../../Mouseion/managers/register'
import autoBind from 'auto-bind'

export default class Composer {
  private readonly comms: SecureCommunications

  constructor(
    private readonly Registry: Register,
  ) {
    this.comms = Registry.get("Communications") as SecureCommunications

    this.comms.register("please open the composer", this.open.bind(this))

    autoBind(this)
  }

  private open({bang}: {bang: string}) {
    const win = WindowManager.newWindow({
      height: 600, width: 800
    })

    const windowManager = new WindowManager(this.Registry, win, 'composer-' + bang)
    windowManager.window = win

    windowManager.loadURL(`file://${__dirname}/../../../public/compose.html#${bang}`)

    win.show()
    win.focus()

    return {bang,}
  }

}