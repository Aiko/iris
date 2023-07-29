import type { Logger, LumberjackEmployer } from "@Iris/common/logger";
import { RESERVED_PORTS } from "@Iris/common/port";
import SockPuppeteer from "@Marionette/ws/sockpuppeteer";
import type Guidepost from "@Chiton/services/guidepost";
import autoBind from "auto-bind";

export class GuidepostPuppeteer extends SockPuppeteer {

  /** Must provide logger or employer */
  constructor(opts: {
    logger?: Logger,
    employer?: LumberjackEmployer,
  }) {
    super("Guidepost", opts, RESERVED_PORTS.GUIDEPOST)
    autoBind(this)
  }

  get = {
    singleton: this.proxy<(typeof Guidepost.prototype.puppetry.get.singleton)>("get.singleton"),
    multiton: this.proxy<(typeof Guidepost.prototype.puppetry.get.multiton)>("get.multiton"),
  }
  set = {
    register: this.proxy<(typeof Guidepost.prototype.puppetry.set.register)>("set.register"),
    add: this.proxy<(typeof Guidepost.prototype.puppetry.set.add)>("set.add"),
    remove: this.proxy<(typeof Guidepost.prototype.puppetry.set.remove)>("set.remove"),
  }

}