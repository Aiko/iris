import type { Logger, LumberjackEmployer } from "@Iris/common/types"
import SockPuppeteer from "@Marionette/ws/sockpuppeteer"
import autoBind from "auto-bind"

//? Import Puppet type:
import type DwarfStar from "@Chiton/store/generic/dwarf-star"


export default class DwarfStarPuppeteer<IStore extends {version: number}> extends SockPuppeteer {

  /** Must provide logger or employer */
  constructor(name: string, port: number, opts: {
    logger?: Logger,
    employer?: LumberjackEmployer,
  }) {
    super(name, opts, port)

    this.register("update", (state: IStore) => this.state = state)

    autoBind(this)
  }

  state: IStore | null = null

  async get() {
    this.state = await this.proxy<(typeof DwarfStar.prototype.puppetry.get)>("get")()
    return this.state
  }
  set = this.proxy<(typeof DwarfStar.prototype.puppetry.set)>("set")
  reset = this.proxy<(typeof DwarfStar.prototype.puppetry.reset)>("reset")

}
