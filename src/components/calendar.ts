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
    this.comms = Registry.get("Inbox Communications") as SecureCommunications

    this.comms.register("please open the calendar", this.open)

    autoBind(this)
  }

  private open({bang}: {bang: string}) {
    const win = WindowManager.newWindow({
      height: 600, width: 800
    })

    this.windowManager = new WindowManager(this.Registry, win, 'calendar-' + bang)
    this.windowManager.window = win

    win.loadURL(`file://${__dirname}/../../public/calendar.html#${bang}`, {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4101.0 Safari/537.36 Edg/83.0.474.0'
    })

    win.show()
    win.focus()

    win.on("closed", () => {
      this.windowManager = null
    })

    return {bang,}
  }

}