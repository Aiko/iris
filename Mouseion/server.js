//? Server bindings for engine & SockPuppet

const Forest = require('./utils/logger')
const Lumberjack = Forest()
const SockPuppet = require('./utils/ws')

/*
  ? This server is unique.
  ? That's because this actually starts two servers;
  ? 1 - Child Process with normal proxy
  ? 2 - WebSocket with SockPuppet proxy
*/

//* Mailbox
const Mailbox = require('./src/mailbox')

const Engine = () => {
  const Log = Lumberjack('Engine')

  let mailbox = {}

  const init = async config => {
    Log.log("Setting up engine")

    mailbox = await Mailbox(Lumberjack, config, {
      SYNC_TIMEOUT: 30 * 1000,
    })

    mailbox.syncSet.add(
      mailbox.Folders.inbox,
      mailbox.Folders.sent,
      ...Object.values(mailbox.Folders.aiko),
    )
  }

  return {
    init,
    sync: {
      immediate: async () => await mailbox.sync.immediate(),
      add: async (...folders) => await mailbox.syncSet.add(...folders),
      remove: async (...folders) => await mailbox.syncSet.remove(...folders)
    },
    folders: {
      get: async () => await mailbox.FolderManager.get(),
      add: async path => await mailbox.FolderManager.add(path),
      remove: async path => await mailbox.FolderManager.remove(path),
      fetch: async () => await mailbox.FolderManager.fetch()
    },
    api: {
      get: {
        single: async mid => await mailbox.api.get.single(mid),
        thread: async tid => await mailbox.api.get.thread(tid),
        latest: async (folder, clientCursor, limit=5000, skip=0) => await mailbox.api.get.latest(folder, clientCursor, limit, skip),
      },
      headers: {
        star: async (folder, uid) => await mailbox.api.headers.star(folder, uid),
        unstar: async (folder, uid) => await mailbox.api.headers.unstar(folder, uid),
        read: async (folder, uid) => await mailbox.api.headers.read(folder, uid),
        unread: async (folder, uid) => await mailbox.api.headers.unread(folder, uid)
      },
      manage: {
        copy: async (src, srcUID, dest) => await mailbox.api.manage.copy(src, srcUID, dest),
        move: async (src, srcUID, dest) => await mailbox.api.manage.move(src, srcUID, dest),
        delete: async (folder, uid) => await mailbox.api.manage.delete(folder, uid)
      }
    },
    contacts: {
      lookup: async partial => await mailbox.contacts.lookup(partial)
    },
    close: async () => {
      Log.log("Closing out the engine and all connections...")
      await mailbox.close()
      Log.success("Safe to exit. Killing engine process.")
      process.exit()
    },
    registerTrigger: trigger => mailbox.registerTrigger(trigger)
  }
}

const engine = Engine()

;;(async () => {
  const { port, trigger } = await SockPuppet(engine)
  engine.registerTrigger(trigger)
  process.send(JSON.stringify({
    wsport: port
  }))
})()


const psucc = id => payload => process.send(JSON.stringify({
  success: true,
  payload, id
}))
const perr = id => msg => process.send(JSON.stringify({
  error: msg + '\n' + (new Error),
  id
}))

/**
 * ! THE BELOW API IS DEPRECATED
 * ! DO NOT USE IT
 * ! IT SHOULD ONLY EVER BE TOUCHED IF YOU, FOR SOME REASON,
 * ! NEED TO KILL THE PROCESS MANUALLY FROM THE MAIN PROCESS
*/
process.on('message', async m => {
  /*
  * m should be 'please ' + JSON stringified message
  * object should have the following structure:
  * {
  *   id: String, // some random string to make ipc easier
  *   action: String,
  *   args: [...] // must ALWAYS be set. for no args just do []
  * }
  */

  try {
    // TODO: eventually some security or so here beyond please...
    const { id, action, args } = JSON.parse(m.substr('please '.length))

    const success = psucc(id)
    const error = perr(id)

    const attempt = async method => {
      try {
        const result = await method(...args)
        return success(result)
      } catch (e) {
        return error(e)
      }
    }

    switch (action) {
      case 'init': return await attempt(engine.init)

      case 'sync.start': return await attempt(engine.sync.start)

      default: return error('You fucked up cunty!');
    }
  } catch (e) {
    return process.send(JSON.stringify({
      error: e + '\n' + (new Error)
    }))
  }
});