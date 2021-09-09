import SecureCommunications from '../utils/comms'
import WindowManager from '../utils/window-manager'
import Register from '../../Mouseion/managers/register'
import autoBind from 'auto-bind'

export default class Calendar {
  private readonly comms: SecureCommunications
  private windowManager: WindowManager | null = null

  constructor(
    private readonly Registry: Register,
  ) {
    this.comms = Registry.get("Communications") as SecureCommunications

    this.comms.register("please open the calendar", this.open)

    autoBind(this)
  }

  private open({bang}: {bang: string}) {
    const win = WindowManager.newWindow({
      height: 600, width: 800
    })

    this.windowManager = new WindowManager(this.Registry, win, 'calendar-' + bang)
    this.windowManager.window = win

    this.windowManager.loadURL(`file://${__dirname}/../../public/calendar.html#${bang}`)

    win.show()
    win.focus()

    win.on("closed", () => {
      this.windowManager = null
    })

    return {bang,}
  }

}