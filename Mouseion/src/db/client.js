const path = require('path')
const { fork } = require('child_process')
const crypto = require('crypto')

// TODO: its probably possible to abstract this by abusing the `get` property in js
// then you could make proxying things as easy as just creating a proxy with the script
// that needs to be run

//* creates a fresh cache process
const CacheProxy = async (Lumberjack, dir) => {
  const Log = Lumberjack('Cache Proxy')
  const API = fork(path.join(__dirname, 'server-nedb.js'), [], {
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

  const proxy_it = method => (...args) => new Promise((s, _) => {
    const id = getID()
    const q = { id, action: method, args }
    const cb = ({ success, payload, error }) => {
      if (error || !success) {
        Log.error(id, '|', error || 'Failed without error.')
        _()
      }
      s(payload)
    }
    waiters[id] = cb
    API.send('please ' + JSON.stringify(q))
  })

  API.on('message', m => {
    const s = JSON.parse(m)
    if (!(s.id)) return Log.error("No ID in received message.")
    const cb = waiters[s.id]
    if (!cb) return Log.error("No waiter set.")
    return cb(s)
  })

  await (proxy_it('create')(dir)).catch(Log.error)

  return {
    L1: {
      cache: proxy_it('L1.cache'),
      check: proxy_it('L1.check')
    },
    L2: {
      cache: proxy_it('L2.cache'),
      check: proxy_it('L2.check')
    },
    L3: {
      cache: proxy_it('L3.cache'),
      check: proxy_it('L3.check')
    },
    lookup: {
      mid: proxy_it('lookup.mid'),
      folder: proxy_it('lookup.folder'),
      aikoFolder: proxy_it('lookup.aikoFolder'),
      withSubject: proxy_it('lookup.withSubject'),
      uid: proxy_it('lookup.uid'),
      tid: proxy_it('lookup.tid'),
      latest: proxy_it('lookup.latest'),
      contact: proxy_it('lookup.contact')
    },
    add: {
      message: proxy_it('add.message'),
      thread: proxy_it('add.thread'),
      contact: proxy_it('add.contact')
    },
    update: {
      message: proxy_it('update.message'),
      refreshThread: proxy_it('update.refreshThread'),
      thread: proxy_it('update.thread'),
      contact: {
        received: proxy_it('update.contact.received'),
        sent: proxy_it('update.contact.sent')
      }
    },
    remove: {
      message: proxy_it('remove.message'),
      thread: proxy_it('remove.thread'),
      location: proxy_it('remove.location')
    },
    merge: {
      message: proxy_it('merge.message'),
      thread: proxy_it('merge.thread'),
    }
  }
}

module.exports = CacheProxy