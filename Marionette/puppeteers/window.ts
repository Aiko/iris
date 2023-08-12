import type Inbox from "@Chiton/components/inbox"
import type { Logger, LumberjackEmployer } from "@Iris/common/types"
import SockPuppeteer from "@Marionette/ws/sockpuppeteer"
import autoBind from "auto-bind"
import { isFullScreen } from "@Veil/state/sections"


export default class WindowPuppeteer extends SockPuppeteer {

  private __fullscreen: boolean = false
  private get _fullscreen() {
    return this.__fullscreen
  }
  private set _fullscreen(s: boolean) {
    this.__fullscreen = s
    isFullScreen.value = s
  }
  get fullscreen() {
    return this._fullscreen
  }
  set fullscreen(s: boolean) {
    this.window.setFullScreen(s)
  }

  /** Must provide logger or employer */
  constructor(name: string, port: number, opts: {
    logger?: Logger,
    employer?: LumberjackEmployer,
  }) {
    super(name, opts, port)

    this.window.getFullScreen().then(s => this._fullscreen = s)
    this.register('fullscreen', (s: boolean) => this._fullscreen = s)

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
