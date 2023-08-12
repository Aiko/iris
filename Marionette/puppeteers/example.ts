import type { Logger, LumberjackEmployer } from "@Iris/common/types"
import SockPuppeteer from "@Marionette/ws/sockpuppeteer"
import autoBind from "auto-bind"

//? Import Puppet type:
// import type Example from "..."


export default class ExamplePuppeteer extends SockPuppeteer {

  /** Must provide logger or employer */
  constructor(name: string, port: number, opts: {
    logger?: Logger,
    employer?: LumberjackEmployer,
  }) {
    super(name, opts, port)

    //? Triggers:
    // this.register('example-event', (...) => ...)

    autoBind(this)
  }

  /*
  foo = {
    bar: this.proxy<(typeof Example.prototype.puppetry.foo.bar)>("foo.bar"),
  }
  baz = this.proxy<(typeof Example.prototype.puppetry.baz)>("baz")
  */

  public async init() {
    await this._init()
    // ...
  }

}
