//* Logging
const Forest = require('./utils/logger')
const Lumberjack = Forest()

//* Utilities
const path = require('path')
const crypto = require('crypto')

//* Multithreading
const { fork } = require('child_process')

//! creates a fresh Mouseion process
const EngineProxy = () => {
  const Log = Lumberjack('Engine Proxy')
  const API = fork(path.join(__dirname, 'server.js'), [], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  })
  API.stdout.pipe(process.stdout);
  API.stderr.pipe(process.stderr);

  const waiters = {}
  const getID = () => {
    const id = crypto.randomBytes(6).toString('hex')
    if (waiters[id]) return getID()
    return id
  }

  const queue = []
  const queueStatus = {}
  let rotating = false

  const proxy_it = (method, qu=false) => (...args) => new Promise((s, _) => {
    const id = getID()
    const q = { id, action: method, args }
    const cb = ({ success, payload, error }) => {
      if (error || !success) {
        Log.error(id, '|', error || 'Failed without error.')
        _()
      }
      else s(payload)
      delete waiters[id]
    }
    waiters[id] = cb
    if (qu) {
      queue.push({
        id,
        msg: 'please ' + JSON.stringify(q)
      })
      if (!rotating) rotate();
    } else API.send('please ' + JSON.stringify(q))
  })

  const rotate = async () => {
    if (queue.length > 0) {
      rotating = true
      const { id, msg } = queue.shift()
      Log.time(msg)
      queueStatus[id] = () => {
        Log.timeEnd(msg)
        delete queueStatus[id]
        rotate()
      }
      API.send(msg)
    } else {
      rotating = false
    }
  }

  API.on('message', m => {
    const s = JSON.parse(m)
    if (!(s.id)) return Log.error("No ID in received message.")
    const cb = waiters[s.id]
    if (!cb) return Log.error("No waiter set.")
    const cb2 = queueStatus[s.id]
    if (cb2) cb2()
    return cb(s)
  })

  return {
    init: proxy_it('init'),
    sync: {
      start: proxy_it('sync.start')
    },
  }
}

module.exports = EngineProxy