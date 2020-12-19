require('colors')
const fs2 = require('fs-extra')
const fs = require('fs')
const path = require('path')

let dir = 'am-log.json'
switch (process.platform) {
  case 'darwin': dir = path.join(process.env.HOME, 'Library', 'Application Support', 'Aiko Mail', dir); break
  case 'win32': dir = path.join(process.env.APPDATA, 'Aiko Mail', dir); break
  case 'linux': dir = path.join(process.env.HOME, '.Aiko Mail', dir); break
}

const Timestamp = () => {
  const now = new Date()
  const date = now.toLocaleDateString()
  const time = now.toTimeString().substr(0, 'HH:MM:SS'.length)
  return `[${date.gray} ${time.cyan}]`.bgBlack
}

const betterLog = (...s) => {
  s.unshift(Timestamp())
  fs2.ensureFileSync(dir)
  fs.appendFileSync(dir, s.map(t => t.stripColors).join(' ') + '\n')

  console.log(...s)
}

module.exports = {
  log: (...s) => betterLog('[AIKO]'.magenta.bgBlack, '[LOG]'.white.bgBlack, ...s),
  error: (...s) => betterLog('[AIKO]'.magenta.bgBlack, '[ERROR]'.white.bgRed, ...s),
  success: (...s) => betterLog('[AIKO]'.magenta.bgBlack, '[SUCCESS]'.white.bgGreen, ...s)
}
