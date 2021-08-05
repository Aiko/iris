//? This is a standalone Post Office IPC server adherent to Aiko SockPuppet standards

import Forest from '../utils/logger'
import { LumberjackEmployer, Logger } from '../utils/logger'
const forest: Forest = new Forest('logs-imap')
const Lumberjack: LumberjackEmployer = forest.Lumberjack
const Log: Logger = Lumberjack('Post Office')

import PostOffice from './post-office'

const courier = new PostOffice(Log)

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

    const attempt = async (method: (...xs: any) => Promise<any> | any) => {
      try {
        const result = await method(...args)
        return success(result)
      } catch (e) {
        return error(e)
      }
    }

    switch (action) {
      case 'network.connect': return await attempt(courier.connect)
      case 'network.close': return await attempt(courier.close)
      case 'network.checkConnect': return await attempt(courier.checkConnect)

      case 'folders.getFolders': return await attempt(courier.getFolders)
      case 'folders.newFolder': return await attempt(courier.newFolder)
      case 'folders.deleteFolder': return await attempt(courier.deleteFolder)
      case 'folders.openFolder': return await attempt(courier.openFolder)

      case 'messages.listMessages': return await attempt(courier.listMessages)
      case 'messages.listMessagesWithFlags': return await attempt(courier.listMessagesWithFlags)
      case 'messages.listMessagesWithHeaders': return await attempt(courier.listMessagesWithHeaders)
      case 'messages.listMessageswithEnvelopes': return await attempt(courier.listMessagesWithEnvelopes)
      case 'messages.listMessagesFull': return await attempt(courier.listMessagesFull)

      case 'messages.searchMessages': return await attempt(courier.searchMessages)
      case 'messages.deleteMessages': return await attempt(courier.deleteMessages)

      case 'messages.addMessage': return await attempt(courier.addMessage)

      case 'messages.copyMessages': return await attempt(courier.copyMessages)
      case 'messages.moveMessages': return await attempt(courier.moveMessages)
      case 'messages.flagMessages': return await attempt(courier.flagMessages)

      default: return error("Action provided to sock puppet does not match any existing binding.")
    }

  } catch (e) {
    return proc.send(JSON.stringify({
      error: e + '\n' + (new Error)
    }))
  }

})