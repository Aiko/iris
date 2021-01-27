//? Client-side engine SockPuppeteer

const Engine = port => {
  const socket = new WebSocket('ws://localhost:' + port)
  socket.binaryType = 'arraybuffer'

  const ensureConnect = () => new Promise((s, _) => {
    const helper = () => {
      if (socket.readyState === 1) {
        return s()
      } else setTimeout(helper, 50)
    }
    helper()
  })

  const waiters = {}
  const listeners = {}

  const ID = () => {
    const id = String.random(12)
    if (waiters[id]) return ID()
    waiters[id] = (..._)=>_
    return id
  }

  socket.onmessage = m => {
    if (m.data) m = m.data
    const { success, error, payload, id, event } = JSON.parse(m)
    if (event) {
      if (listeners[event]) listeners[event]()
      return;
    }
    if (!id) return console.error("Received untagged websocket response:", m)
    const s = waiters[id]
    if (!s) return console.error("No resolver pair for websocket pairing:", m)
    if (error) {
      console.error(error)
      return s(null)
    }
    if (!success) {
      console.error("Server designated unsuccessful call:", m)
      return s(payload)
    }
    return s(payload)
  }

  const proxy = action => (...args) => new Promise(async (s, _) => {
    const id = ID()
    waiters[id] = s
    await ensureConnect()
    socket.send('please ' + JSON.stringify({ id, action, args }))
  })

  return {
    port,
    on: (event, cb) => (listeners[event] = cb),
    init: async config => await proxy('init')(config).catch(console.error),
    sync: {
      immediate: async () => await proxy('sync.immediate')().catch(console.error),
      add: async (...paths) => await proxy('sync.add')().catch(console.error),
      remove: async (...paths) => await proxy('sync.remove')().catch(console.error)
    },
    folders: {
      get: async () => await proxy('folders.get')().catch(console.error),
      add: async path => await proxy('folders.add')(path).catch(console.error),
      remove: async path => await proxy('folders.remove')(path).catch(console.error),
      fetch: async () => await proxy('folders.fetch')().catch(console.error)
    },
    api: {
      get: {
        single: async mid => await proxy('api.get.single')(mid).catch(console.error),
        thread: async tid => await proxy('api.get.thread')(tid).catch(console.error),
        latest: async (folder, cursor, limit=5000, skip=0) => await proxy('api.get.latest')(folder, cursor, limit, skip).catch(console.error)
      },
      headers: {
        star: async (folder, uid) => await proxy('api.headers.star')(folder, uid).catch(console.error),
        unstar: async (folder, uid) => await proxy('api.headers.unstar')(folder, uid).catch(console.error),
        read: async (folder, uid) => await proxy('api.headers.read')(folder, uid).catch(console.error),
        unread: async (folder, uid) => await proxy('api.headers.unread')(folder, uid).catch(console.error),
      },
      manage: {
        copy: async (src, srcUID, dest) => await proxy('api.manage.copy')(src, srcUID, dest).catch(console.error),
        move: async (src, srcUID, dest) => await proxy('api.manage.move')(src, srcUID, dest).catch(console.error),
        delete: async (folder, uid) => await proxy('api.manage.delete')(folder, uid).catch(console.error)
      }
    },
    contacts: {
      lookup: async partial => await proxy('contacts.lookup')(partial).catch(console.error)
    },
    close: async () => await proxy('close')().catch(console.error)
  }

}

window.Engine = Engine