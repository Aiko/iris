const colors = require('colors')
const fs2 = require('fs2')
const fs = require('fs')

let dir = 'am-log.json'
switch (process.platform) {
  case 'darwin': dir = path.join(process.env.HOME, 'Library', 'Application Support', 'Aiko Mail', dir); break
  case 'win32': dir = path.join(process.env.APPDATA, 'Aiko Mail', dir); break
  case 'linux': dir = path.join(process.env.HOME, '.Aiko Mail', dir); break
}

const betterLog = (...s) => {
  fs2.ensureFileSync(dir)
  fs.appendFileSync(dir, s.join(' ') + '\n')

  console.log(...s)
}

module.exports = {
  log: (...s) => console.log('[AIKO]'.magenta.bgBlack, '[LOG]'.white.bgBlack, ...s),
  error: (...s) => console.log('[AIKO]'.magenta.bgBlack, '[ERROR]'.white.bgRed, ...s),
  success: (...s) => console.log('[AIKO]'.magenta.bgBlack, '[SUCCESS]'.white.bgGreen, ...s)
}
