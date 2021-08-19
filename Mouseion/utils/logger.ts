import autoBind from 'auto-bind'
import 'colors'
import crypto from 'crypto'
import path from 'path'
import Storage from './storage'

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
  success: log_fn
  warn: log_fn
  time: log_fn
  timeEnd: log_fn
}
class UnemployedLumberjack implements Logger {
  readonly label: string
  readonly forest: Forest
  constructor(label: string, forest: Forest) {
    this.label = label
    this.forest = forest
  }

  private readonly _log = (prefix: string) => (..._: any[]) =>
    this.forest.logger(prefix, this.label, ..._)

  log = this._log(Forest.prefixes.log)
  error = this._log(Forest.prefixes.error)
  success = this._log(Forest.prefixes.success)
  warn = this._log(Forest.prefixes.warn)

  //! Timing functions will not appear in logs (intentional)
  time = (..._: any[]) => console.time([Forest.prefixes.timer, this.label, ..._].join(' '))
  timeEnd = (..._: any[]) => console.timeEnd([Forest.prefixes.timer, this.label, ..._].join(' '))

}
export type LumberjackEmployer = (label: string) => Logger

//? Initialize one forest per "application" and use Lumberjacks for different labels
export default class Forest {
  readonly dir: string;
  readonly storage: Storage;
  readonly id: string;
  static readonly prefixes = {
    log:     '[  LOG  ]'.black.bgWhite,
    error:   '[ ERROR ]'.white.bgRed,
    success: '[SUCCESS]'.green.bgBlack,
    warn:    '[ WARN! ]'.yellow.bgBlack,
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

    console.log(`Forest initialized in ${this.storage.dir}/${this.id}`.green.bgBlack)
    autoBind(this)
  }

  logger(prefix: string, label: string, ...msg: any[]): void {
    const identifier = Identifier(prefix, label)
    if (prefix == Forest.prefixes.error) {
      console.log(identifier, ...msg, new Error) //? dumps trace
    } else {
      console.log(identifier, ...msg)
    }

    //? remove color escape sequences and dump to log
    const uncolored_msg: string = msg.map((m: string): string => JSON.stringify(m)?.stripColors).join(' ')
    this.storage.append(this.id, `${identifier?.stripColors} ${uncolored_msg}\n`)
  }

  Lumberjack = (label: string): Logger => new UnemployedLumberjack(label, this)

}