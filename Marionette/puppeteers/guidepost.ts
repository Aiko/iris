import type { LumberjackEmployer } from "@Iris/common/types";
import { RESERVED_PORTS } from "@Iris/common/port";
import SockPuppeteer from "@Marionette/ws/sockpuppeteer";
import type Guidepost from "@Chiton/services/guidepost";
import autoBind from "auto-bind";
import type RemoteLogger from "@Veil/services/roots";

export default class GuidepostPuppeteer extends SockPuppeteer {

  /** Must provide logger or employer */
  constructor(opts: {
    logger?: RemoteLogger,
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