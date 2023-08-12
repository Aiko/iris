import type Inbox from "@Chiton/components/inbox"
import type { Logger, LumberjackEmployer } from "@Iris/common/types"
import SockPuppeteer from "@Marionette/ws/sockpuppeteer"
import autoBind from "auto-bind"
import WindowPuppeteer from "@Marionette/puppeteers/window"


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
