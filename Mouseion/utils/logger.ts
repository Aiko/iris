import autoBind from 'auto-bind'
import 'colors'
import crypto from 'crypto'
import path from 'path'
import Storage from './storage'
import WebSocket from 'ws'
import sleep from './sleep'
import { performance } from 'perf_hooks'

/** Generates a string timestamp of the current date/time */
export const Timestamp = (): string => {
  const now: Date = new Date()
  const date: string = now.toLocaleDateString()
  const time: string = now.toTimeString().substr(0, 'HH:MM:SS'.length)
  return `[${date.gray} ${time.cyan}]`.bgBlack
}

/**
 * Generates an identifier using the current time, a prefix, and a label
 * @param {string} prefix - the prefix this identifier will use
 * @param {string} label - a label for this identifier, will automatically be wrapped in square brackets
*/
const Identifier = (prefix: string, label: string): string => {
  const timestamp: string = Timestamp()
  const signature: string = `[M]`.rainbow.bgBlack
  return `${timestamp}${signature}${prefix}[${label.magenta}]`
}

type log_fn = (...msg: any[]) => void;
export interface Logger {
  log: log_fn
  error: log_fn
  success: log_fn,
  shout: log_fn,
  warn: log_fn
  time: log_fn
  timeEnd: log_fn
}
class UnemployedLumberjack implements Logger {
  readonly label: string
  readonly forest: Forest

  private timers: {[key: string]: number} = {}

  constructor(label: string, forest: Forest) {
    this.label = label
    this.forest = forest
  }

  private readonly _log = (prefix: string) => (..._: any[]) =>
    this.forest.logger(prefix, this.label, ..._)

  log = this._log(Forest.prefixes.log).bind(this)
  error = this._log(Forest.prefixes.error).bind(this)
  shout = this._log(Forest.prefixes.shout).bind(this)
  success = this._log(Forest.prefixes.success).bind(this)
  warn = this._log(Forest.prefixes.warn).bind(this)

  //! Timing functions will not appear in logs (intentional)
  time = (..._: any[]) => {
    const label: string = [Forest.prefixes.timer, this.label, ..._].join(' ')
    this.timers[label] = performance.now()
  }
  timeEnd = (..._: any[]) => {
    const now = performance.now()
    const label = [Forest.prefixes.timer, this.label, ..._].join(' ')
    const start = this.timers[label]
    if (!start) this._log(Forest.prefixes.warn)('No timer found for', label)
    else this._log(Forest.prefixes.timer)(label, ':', now - start, 'ms')
  }

}
export type LumberjackEmployer = (label: string) => Logger

//? Initialize one forest per "application" and use Lumberjacks for different labels
export default class Forest {
  readonly dir: string;
  readonly storage: Storage;
  readonly id: string;
  private readonly roots?: WebSocket

  static readonly prefixes = {
    log:     '[  LOG  ]'.black.bgWhite,
    error:   '[ ERROR ]'.white.bgRed,
    shout:   '[ SHOUT ]'.red.bgCyan,
    success: '[SUCCESS]'.green.bgBlack,
    warn:    '[ WARN⚠️ ]'.yellow.bgBlack,
    timer:   '[ TIMER ]'.red.bgWhite
  }

  constructor(dir: string='logs') {

    //? initialize dir to the correct app datapath
    const platform: string = process.platform
    switch (platform) {
      case 'darwin': dir = path.join(
        process.env.HOME as string, 'Library', 'Application Support',
        'Aiko Mail', 'Mouseion', dir
      ); break;
      case 'win32': dir = path.join(
        process.env.APPDATA as string,
        'Aiko Mail', 'Mouseion', dir
      ); break;
      case 'linux': dir = path.join(
        process.env.HOME as string,
        '.Aiko Mail', 'Mouseion', dir
      ); break;
    }
    this.dir = dir

    //? logger appends strings so we want regular files
    this.storage = new Storage(dir, {json: false})

    //? randomly generate some "probably unique" identifier
    this.id = crypto.randomBytes(6).toString('hex')
    try {
      const socket = new WebSocket('ws://localhost:4159')
      this.roots = socket
    } catch (e) {
      console.error(e)
    }

    console.log(`Forest initialized in ${this.storage.dir}/${this.id}`.green.bgBlack)
    autoBind(this)
  }

  logger(prefix: string, label: string, ...msg: any[]): void {
    const identifier = Identifier(prefix, label)
    let e: Error | null = null
    if (prefix == Forest.prefixes.error) {
      e = new Error("(stack trace pin)")
      console.log(identifier, ...msg, e) //? dumps trace
    } else if (prefix == Forest.prefixes.shout) {
      console.log(identifier, ...(msg.map(m => m.toString().red.bgCyan)))
    } else {
      console.log(identifier, ...msg)
    }

    //? remove color escape sequences and dump to log
    const uncolored_msg: string = msg.map((m: string): string => JSON.stringify(m)?.stripColors).join(' ')
    const clean_msg: string = e ? `${identifier?.stripColors} ${uncolored_msg}\n${e.stack}\n` : `${identifier?.stripColors} ${uncolored_msg}\n`
    this.storage.append(this.id, clean_msg)
    this.sendToRoots(clean_msg)
  }

  async sendToRoots(msg: string, max_tries=10): Promise<void> {
    if (!(this.roots)) return;
    for(let i = 0; i < max_tries; i++) {
      if (this.roots.readyState === 1) return (this.roots.send(msg))
      await sleep(200)
    }
  }

  Lumberjack = (label: string): Logger => new UnemployedLumberjack(label, this)

}