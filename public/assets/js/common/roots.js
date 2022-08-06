// log prefix:
//* [7/31/2022 23:06:51][M][  LOG  ]

const Timestamp = () => {
  const now = new Date()
  const date = now.toLocaleDateString()
  const time = now.toTimeString().substr(0, 'HH:MM:SS'.length)
  return `[${date} ${time}]`
}

const BluetoothLumberjack = () => {
  const socket = new WebSocket('ws://localhost:4158')
  socket.binaryType = 'arraybuffer'
  const prefixes = {
    log:     '[  LOG  ]',
    info:   '[ DEBUG ]',
    success: '[SUCCESS]',
    error:   '[ ERROR ]',
    warn:    '[ WARN⚠️ ]',
  }

  const queue = []
  const poll = async () => {
    if (socket.readyState === socket.CONNECTING) return;
    while (queue.length > 0) {
      const message = queue.shift()
      socket.send(message)
    }
  }
  setInterval(poll, 100)

  const log = prefix => (...msg) => {
    for (let i = 0; i < msg.length; i++) {
      if (typeof msg[i] === "string" && msg[i].startsWith('%c')) {
        msg[i] = msg[i].replace('%c', '')
        msg[i+1] = ""
      }
    }
    msg = msg.filter(m => m !== "")
    queue.push([Timestamp(), "[C]", prefix, msg.join(" "), "\n"].join(""))
  }

  return {
    log: log(prefixes.log),
    info: log(prefixes.info),
    success: log(prefixes.success),
    error: log(prefixes.error),
    warn: log(prefixes.warn),
    q: () => queue,
    poll,
    socket
  }
}

const BluetoothLogger = BluetoothLumberjack()

// the only gf you will ever see as a swe
const chain = (f1, f2) => (...args) => {
  f2(...args);
  f1(...args);
}

const log = chain(console.log, BluetoothLogger.log)
const info = chain(console.info, BluetoothLogger.info)
const success = chain(console.log, BluetoothLogger.success)
const error = chain(console.error, BluetoothLogger.error)
const warn = chain(console.warn, BluetoothLogger.warn)
window.log = log
window.info = info
window.success = success
window.error = error
window.warn = warn