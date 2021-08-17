import autoBind from "auto-bind";
import Mailbox from "./managers/mailbox";
import { IMAPConfig } from "./post-office/types";

export default class Engine {

  constructor(
    public mailbox: Mailbox
  ) {
    autoBind(this)
  }

  static async init(config: IMAPConfig) {
    const mailbox = await Mailbox.load(
      config, 500, 100
    )
    if (!mailbox) throw "Mailbox failed to construct"
    return new Engine(mailbox)
  }

  //? Some API

}