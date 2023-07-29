import { RESERVED_PORTS } from "@Iris/common/port"
import autoBind from "auto-bind"

//? Handles logging pretty messages to the console
//? AND sends them back up to Chiton Roots for unified logging

const Timestamp = () => {
  const now = new Date()
  const date = now.toLocaleDateString()
  const time = now.toTimeString().substr(0, 'HH:MM:SS'.length)
  return `[${date} ${time}]`
}

export default class RemoteLogger {

  private static readonly RemoteLumberjack = class {
    private readonly socket = new WebSocket("ws://localhost:" + RESERVED_PORTS.ROOTS.REMOTE)
    private queue: string[] = []

    private readonly prefixes = {
      log:     '[  LOG  ]',
      info:   '[ DEBUG ]',
      success: '[SUCCESS]',
      error:   '[ ERROR ]',
      warn:    '[ WARN! ]'
    }

    constructor() {
      this.socket.binaryType = "arraybuffer"

      setInterval(this.poll.bind(this), 100)
    }

    private async poll() {
      if (this.socket.readyState === this.socket.CONNECTING) return;
      while (this.queue.length > 0) {
        const message = this.queue.shift()
        if (message) this.socket.send(message)
      }
    }

    private _log(prefix: string) {
      return ((...msg: any[]) => {
        for (let i = 0; i < msg.length; i++) {
          if (typeof msg[i] === "string" && msg[i].startsWith('%c')) {
            msg[i] = msg[i].replace('%c', '')
            msg[i+1] = ""
          }
        }
        msg = msg.filter(m => m !== "")
        this.queue.push([Timestamp(), "[C]", prefix, msg.join(" "), "\n"].join(""))
      }).bind(this)
    }

    public log = this._log(this.prefixes.log)
    public info = this._log(this.prefixes.info)
    public success = this._log(this.prefixes.success)
    public error = this._log(this.prefixes.error)
    public warn = this._log(this.prefixes.warn)
  }
  private readonly Lumberjack = new RemoteLogger.RemoteLumberjack();

  private readonly tag: string[]

  constructor(prefix: string, { bgColor, fgColor }: { bgColor?: string, fgColor?: string } ={}) {
    fgColor = fgColor || "#ffffff"
    bgColor = bgColor || "#4b74ff"
    this.tag = [`%c[${prefix}]`, `
      background-color: ${bgColor};
      color: ${fgColor};
      border-radius: 3px;
      padding: 3px;
      padding-top: 5px;
      padding-bottom: 5px;
      font-weight: 800;
    `]
    autoBind(this)
  }

  public log(...msg: any[]) {
    console.log(...this.tag, ...msg)
    this.Lumberjack.log(...this.tag, ...msg)
  }

  public info(...msg: any[]) {
    console.info(...this.tag, ...msg)
    this.Lumberjack.info(...this.tag, ...msg)
  }

  public success(...msg: any[]) {
    console.log(...this.tag, ...msg)
    this.Lumberjack.success(...this.tag, ...msg)
  }

  public error(...msg: any[]) {
    console.error(...this.tag, ...msg)
    this.Lumberjack.error(...this.tag, ...msg)
  }

  public warn(...msg: any[]) {
    console.warn(...this.tag, ...msg)
    this.Lumberjack.warn(...this.tag, ...msg)
  }

}
