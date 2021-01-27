const path = require('path')
const { fork } = require('child_process')
const crypto = require('crypto')

// TODO: its probably possible to abstract this by abusing the `get` property in js
// then you could make proxying things as easy as just creating a proxy with the script
// that needs to be run

//* creates a fresh post office process
const PostOfficeProxy = Lumberjack => {
  const Log = Lumberjack('Post Office Proxy')
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
      // (msg)
      queueStatus[id] = () => {
        // Log.timeEnd(msg)
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
    network: {
      connect: proxy_it('network.connect'),
      close: proxy_it('network.close'),
      checkConnect: proxy_it('network.checkConnect'),
    },
    folders: {
      getFolders: proxy_it('folders.getFolders'),
      newFolder: proxy_it('folders.newFolder'),
      deleteFolder: proxy_it('folders.deleteFolder'),
      openFolder: proxy_it('folders.openFolder'),
    },
    messages: {
      listMessages: proxy_it('messages.listMessages', qu=true),
      searchMessages: proxy_it('messages.searchMessages'),
      deleteMessages: proxy_it('messages.deleteMessages'),
      addMessage: proxy_it('messages.addMessage'),
      copyMessages: proxy_it('messages.copyMessages'),
      moveMessages: proxy_it('messages.moveMessages'),
      flagMessages: proxy_it('messages.flagMessages')
    }
  }
}

module.exports = PostOfficeProxy