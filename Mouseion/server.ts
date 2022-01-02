import Engine from './engine';
import { IMAPConfig } from './post-office/types';
import Marionette from './utils/marionette'

if (!process.send) console.error("Process was spawned without IPC and is now likely in a BAD state.")

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

let engine: Engine;

const init = async (config: IMAPConfig) => {
  console.log("Initializing Engine".magenta)
  engine = await Engine.init(config)
  const marionette = await Marionette.build(engine.API)
  engine.trigger.register(marionette.trigger)
  proc.send(JSON.stringify({
    wsport: marionette.port
  }))
}

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

    if (!id) return console.error("No ID provided to Marionette.")
    if (!action) return console.error("No action provided to Marionette.")

    const success = psucc(id)
    const error = perr(id)

    if (!(engine) && action != 'init') {
      return error("Mouseion has not yet been initialized.")
    }

    const attempt = async (method: (...xs: any) => Promise<any> | any) => {
      try {
        const result = await method(...args)
        return success(result)
      } catch (e) {
        if (typeof e === 'string') return error(e)
        else if (e instanceof Error) return error(e.message)
        else return error(JSON.stringify(e))
      }
    }

    switch (action) {

      case 'init': return await attempt(init)
      case 'sync.start': return await attempt(engine.sync.start)
      case 'reconnect': return await attempt(engine.reconnect)
      case 'close': return await attempt(engine.close)

      default: return error("Action provided to Marionette does not match any existing binding: " + action)
    }

  } catch (e) {
    return proc.send(JSON.stringify({
      error: e + '\n' + (new Error)
    }))
  }

})