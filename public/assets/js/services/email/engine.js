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
    //console.log("Got response of size", m.length)
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

  /*

  contacts = {
    lookup: this.mailbox.pantheon.db.contacts.search
  }
  trigger = {
    register: this.mailbox.register,
    shoot: this.mailbox.trigger
  }
  */

  return {
    port,
    on: (event, cb) => (listeners[event] = cb),
    reconnect: async config => await proxy('reconnect')(config).catch(console.error),
    sync: {
      immediate: async () => await proxy('sync.immediate')().catch(console.error),
      start: async () => await proxy('sync.start')().catch(console.error),
      stop: async () => await proxy('sync.stop')().catch(console.error),
      add: async (...paths) => await proxy('sync.add')(...paths).catch(console.error),
      remove: async (...paths) => await proxy('sync.remove')(...paths).catch(console.error)
    },
    folders: {
      state: async () => await proxy('folders.state')().catch(console.error),
      sync: async () => await proxy('folders.sync')().catch(console.error),
      add: async path => await proxy('folders.add')(path).catch(console.error),
      remove: async path => await proxy('folders.remove')(path).catch(console.error),
      boards: async () => await proxy('folders.boards')().catch(console.error),
      all: async () => await proxy('folders.all')().catch(console.error),
    },
    resolve: {
      messages: {
        full: async MID => await proxy('resolve.messages.full')(MID).catch(console.error),
        content: async MID => await proxy('resolve.messages.content')(MID).catch(console.error),
        headers: async MID => await proxy('resolve.messages.headers')(MID).catch(console.error),
        envelope: async MID => await proxy('resolve.messages.envelope')(MID).catch(console.error),
      },
      thread: {
        full: async TID => await proxy('resolve.thread.full')(TID).catch(console.error),
        content: async TID => await proxy('resolve.thread.content')(TID).catch(console.error),
        headers: async TID => await proxy('resolve.thread.headers')(TID).catch(console.error),
      },
      threads: {
        latest: async (folder, minCursor, limit=5000) => await proxy('resolve.threads.latest')(folder, minCursor, limit).catch(console.error),
      }
    },
    manage: {
      star: async (folder, uid) => await proxy('manage.star')(folder, uid).catch(console.error),
      unstar: async (folder, uid) => await proxy('manage.unstar')(folder, uid).catch(console.error),
      read: async (folder, uid) => await proxy('manage.read')(folder, uid).catch(console.error),
      unread: async (folder, uid) => await proxy('manage.unread')(folder, uid).catch(console.error),
      archive: async (folder, uid) => await proxy('manage.archive')(folder, uid).catch(console.error),
      copy: async (srcFolder, srcUID, destFolder) => await proxy('manage.copy')(srcFolder, srcUID, destFolder).catch(console.error),
      delete: async (folder, uid) => await proxy('manage.delete')(folder, uid).catch(console.error),
      move: async (srcFolder, srcUID, destFolder) => await proxy('manage.move')(srcFolder, srcUID, destFolder).catch(console.error),
    },
    contacts: {
      lookup: async partial => await proxy('contacts.lookup')(partial).catch(console.error)
    },
    boardRules: {
      add: async rule => await proxy('boardRules.add')(rule).catch(console.error),
      list: async () => await proxy('boardRules.list')().catch(console.error),
      queue: async (...mids) => await proxy('boardRules.queue')(...mids).catch(console.error),
      consume: async () => await proxy('boardRules.consume')().catch(console.error)
    },
    triggers: {
      shoot: async event => await proxy('triggers.shoot')(event).catch(console.error)
    },
    close: async () => await proxy('close')().catch(console.error)
  }

}

window.Engine = Engine