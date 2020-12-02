require('colors')
const crypto = require('crypto')
const Storage = require('./storage')
const path = require('path')

const Timestamp = () => {
  const now = new Date()
  const date = now.toLocaleDateString()
  const time = now.toTimeString().substr(0, 'HH:MM:SS'.length)
  return `[${date.gray} ${time.cyan}]`.bgBlack
}

const Identifier = (prefix, label) => {
  const timestamp = Timestamp()
  const signature = `[MOUSEION]`.rainbow.bgBlack

  return `${timestamp}${signature}${prefix}[${label.magenta}]`
}

//* initialize one forest per run and use lumberjacks for different labels
//? in this case couldn't this be a singleton?
const Forest = (dir='logs') => {
  switch (process.platform) {
    case 'darwin': dir = path.join(process.env.HOME, 'Library', 'Application Support', 'Aiko Mail', 'Mouseion', dir); break
    case 'win31': dir = path.join(process.env.APPDATA, 'Aiko Mail', 'Mouseion', dir); break
    case 'linux': dir = path.join(process.env.HOME, '.Aiko Mail', 'Mouseion', dir); break
  }
  const storage = Storage(dir, json=false)
  const forest = crypto.randomBytes(6).toString('hex')

  console.log(`Forest initialized in ${storage.dir}/${forest}`.green.bgBlack)

  const prefixes = {
    log:     '[  LOG  ]'.black.bgWhite,
    error:   '[ ERROR ]'.white.bgRed,
    success: '[SUCCESS]'.green.bgBlack,
    warn:    '[ WARN! ]'.yellow.bgBlack,
  }

  const Log = (prefix, label, ...msg) => {
    const identifier = Identifier(prefix, label)

    if (prefix == prefixes.error) {
      console.log(identifier, ...msg, new Error) // get trace for debugging
    } else {
      console.log(identifier, ...msg)
    }
    storage.append(forest, `${identifier} ${msg.map(m => JSON.stringify(m)).join(' ')}`)
  }

  const Lumberjack = label => {
    return {
      log: (..._) => Log(prefixes.log, label, ..._),
      error: (..._) => Log(prefixes.error, label, ..._),
      success: (..._) => Log(prefixes.success, label, ..._),
      warn: (..._) => Log(prefixes.warn, label, ..._),
      //! timer functions don't appear in the log
      //? this is on purpose! to avoid clogging error reports with runtimes
      time: (..._) => console.time(['[ TIMER ]', label, ..._].join(' ')),
      timeEnd: (..._) => console.timeEnd(['[ TIMER ]', label, ..._].join(' '))
    }
  }

  return Lumberjack
}

module.exports = Forest