//? Client-side engine SockPuppeteer

const Engine = port => {
  const socket = new WebSocket('ws://localhost:' + port)
  socket.binaryType = 'arraybuffer'

  const waiters = {}

  const ID = () => {
    const id = String.random(12)
    if (waiters[id]) return ID()
    waiters[id] = (..._)=>_
    return id
  }

  socket.onmessage = m => {
    const { success, error, payload, id } = JSON.parse(m)
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

  const proxy = action => (...args) => new Promise((s, _) => {
    const id = ID()
    waiters[id] = s
    socket.send('please ' + JSON.stringify({ id, action, args }))
  })

  return {
    init: async config => await proxy('init')(config).catch(console.error),
    sync: {
      immediate: async () => await proxy('sync.immediate')().catch(console.error)
    },
    folders: {
      get: async () => await proxy('folders.get')().catch(console.error),
      add: async path => await proxy('folders.add')(path).catch(console.error),
      remove: async path => await proxy('folders.remove')(path).catch(console.error),
      fetch: async () => await proxy('folders.fetch')().catch(console.error)
    },
    close: async () => await proxy('close')().catch(console.error)
  }

}

window.Engine = Engine