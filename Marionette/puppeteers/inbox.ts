import type Inbox from "@Chiton/components/inbox"
import type { Logger, LumberjackEmployer } from "@Iris/common/logger"
import SockPuppeteer from "@Marionette/ws/sockpuppeteer"
import autoBind from "auto-bind"

export default class InboxPuppeteer extends SockPuppeteer {

  /** Must provide logger or employer */
  constructor(port: number, opts: {
    logger?: Logger,
    employer?: LumberjackEmployer,
  }) {
    super("Inbox", opts, port)
    autoBind(this)
  }

  window = {
    maximize: this.proxy<(typeof Inbox.prototype.puppetry.window.maximize)>("window.maximize"),
    unmaximize: this.proxy<(typeof Inbox.prototype.puppetry.window.unmaximize)>("window.unmaximize"),
    minimize: this.proxy<(typeof Inbox.prototype.puppetry.window.minimize)>("window.minimize"),
    setFullScreen: this.proxy<(typeof Inbox.prototype.puppetry.window.setFullScreen)>("window.setFullScreen"),
    getFullScreen: this.proxy<(typeof Inbox.prototype.puppetry.window.getFullScreen)>("window.getFullScreen"),
    close: this.proxy<(typeof Inbox.prototype.puppetry.window.close)>("window.close"),
    hide: this.proxy<(typeof Inbox.prototype.puppetry.window.hide)>("window.hide"),
    focus: this.proxy<(typeof Inbox.prototype.puppetry.window.focus)>("window.focus"),
    findInWindow: this.proxy<(typeof Inbox.prototype.puppetry.window.findInWindow)>("window.findInWindow"),
  }

}
