//? This is a standalone Pantheon IPC server adherent to Aiko SockPuppet standards

import Forest from '../utils/logger'
import { LumberjackEmployer, Logger } from '../utils/logger'
const forest: Forest = new Forest('logs-pantheon')
const Lumberjack: LumberjackEmployer = forest.Lumberjack
const Log: Logger = Lumberjack('Pantheon')

import { DB, Cache } from './pantheon'

let cache: Cache;
let db: DB;

if (!process.send) Log.error("Process was spawned without IPC and is now likely in a BAD state.")

// TODO: refactor this into a SockPuppet module
interface SockPuppetProcess extends NodeJS.Process {
  send: (message: any, sendHandle?: any, options?: {
    swallowErrors?: boolean | undefined;
  } | undefined, callback?: ((error: Error | null) => void) | undefined) => boolean
}

const proc: SockPuppetProcess = <SockPuppetProcess> process ;;

const psucc = (id: string) => (payload: object): boolean => proc.send(JSON.stringify({
  success: true,
  payload, id
}))
const perr = (id: string) => (msg: string): boolean => proc.send(JSON.stringify({
  error: msg + '\n' + (new Error),
  payload: {},
  success: false,
  id
}))

proc.on('message', async (m: string): Promise<any> => {
  /*
  ? m should be 'please ' + JSON stringified message
  * object should have the following structure:
  * {
  *   id: String, // some random string to make ipc easier
  *   action: String,
  *   args: [...] // must ALWAYS be set. for no args just do []
  * }
  */

  try {
    // TODO: eventually some security or so here beyond 'please'...
    const {
      id,
      action,
      args
    }: {
      id: string,
      action: string,
      args: any[]
    } = JSON.parse(m.substr('please '.length))

    if (!id) return Log.error("No ID provided to sock puppet.")
    if (!action) return Log.error("No action provided to sock puppet.")

    const success = psucc(id)
    const error = perr(id)

    if ((!(db) || !(cache)) && action != 'init') {
      return error("Pantheon has not yet been initialized.")
    }

    const attempt = async (method: (...xs: any) => Promise<any> | any) => {
      try {
        const result = await method(...args)
        return success(result)
      } catch (e) {
        Log.error(e)
        if (typeof e === 'string') return error(e)
        else if (e instanceof Error) return error(e.message)
        else return error(JSON.stringify(e))
      }
    }

    switch (action) {

      case 'init':
        if (cache) return error("Cache already exists.")
        if (db) return error("DB already exists")
        const dbLog = Lumberjack("Pantheon (DB)")
        const cacheLog = Lumberjack("Pantheon (Cache)")
        db = new DB(args[0], args[1], args[2], dbLog)
        dbLog.success("DB initialized.")
        cache = new Cache(args[0], db, cacheLog)
        cacheLog.success("Cache initialized.")
        return success({cursor: db.getCursor()})
      case 'cursor.next':
        return success({cursor: db.nextCursor()})
      case 'cursor.get':
        return success({cursor: db.getCursor()})
      case 'cursor.prev':
        return success({cursor: db.prevCursor()})

      case 'cache.envelope.cache': return await attempt(cache.envelope.cache)
      case 'cache.envelope.check': return await attempt(cache.envelope.check)
      case 'cache.headers.cache': return await attempt(cache.headers.cache)
      case 'cache.headers.check': return await attempt(cache.headers.check)
      case 'cache.content.cache': return await attempt(cache.content.cache)
      case 'cache.content.check': return await attempt(cache.content.check)
      case 'cache.full.cache': return await attempt(cache.full.cache)
      case 'cache.full.check': return await attempt(cache.full.check)

      case 'db.messages.find.mid': return await attempt(db.findMessageWithMID)
      case 'db.messages.find.uid': return await attempt(db.findMessageWithUID)
      case 'db.messages.find.folder': return await attempt(db.findMessagesInFolder)
      case 'db.messages.find.subject': return await attempt(db.findMessagesWithSubject)
      case 'db.messages.add': return await attempt(db.addMessage)
      case 'db.messages.update': return await attempt(db.updateMessage)
      case 'db.messages.purge.all': return await attempt(db.removeMessage)
      case 'db.messages.purge.location': return await attempt(db.removeMessageLocation)
      case 'db.messages.audit_log': return await attempt(db.messageAuditLog)

      case 'db.threads.find.tid': return await attempt(db.findThreadWithTID)
      case 'db.threads.find.latest': return await attempt(db.findThreadsByLatest)
      case 'db.threads.find.folder': return await attempt(db.findThreadsInFolder)
      case 'db.threads.merge': return await attempt(db.mergeThreads)
      case 'db.threads.messages': return await attempt(db.threadMessages)
      case 'db.threads.audit_log': return await attempt(db.threadAuditLog)

      case 'db.contacts.search': return await attempt(db.findContacts)
      case 'db.contacts.update.received': return await attempt(db.updateContactReceived)
      case 'db.contacts.update.sent': return await attempt(db.updateContactSent)

      case 'db.attachments.search': return await attempt(db.findAttachments)

      default: return error("Action provided to sock puppet does not match any existing binding.")
    }

  } catch (e) {
    return proc.send(JSON.stringify({
      error: e + '\n' + (new Error)
    }))
  }

})