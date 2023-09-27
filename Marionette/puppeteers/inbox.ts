import type { Logger, LumberjackEmployer } from "@Iris/common/types"
import autoBind from "auto-bind"
import WindowPuppeteer from "@Marionette/puppeteers/generic/window"


export default class InboxPuppeteer extends WindowPuppeteer {

  /** Must provide logger or employer */
  constructor(port: number, opts: {
    logger?: Logger,
    employer?: LumberjackEmployer,
  }) {
    super("Inbox", port, opts)
    autoBind(this)
  }

}
