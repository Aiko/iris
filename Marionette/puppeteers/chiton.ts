import type { Logger, LumberjackEmployer } from "@Iris/common/types"
import SockPuppeteer from "@Marionette/ws/sockpuppeteer"
import autoBind from "auto-bind"

//? Import Puppet type:
import type Chiton from "@Chiton/app"
import { RESERVED_PORTS } from "@Iris/common/port"


export default class ChitonPuppeteer extends SockPuppeteer {

  /** Must provide logger or employer */
  constructor(opts: {
    logger?: Logger,
    employer?: LumberjackEmployer,
  }) {
    super("Chiton", opts, RESERVED_PORTS.CHITON)

    autoBind(this)
  }

  app = {
    updateAndRestart: this.proxy<(typeof Chiton.puppetry.app.updateAndRestart)>("app.updateAndRestart"),
  }
  config = this.proxy<(typeof Chiton.puppetry.config)>("config")

  //? don't need to initialize

}
