import WebSocket, { Server } from 'ws'
import { unused_port, RESERVED_PORTS } from '@Iris/utils/port'
import { Lumberjack } from '@Iris/utils/logger'
import type { LumberjackEmployer, Logger } from '@Iris/utils/logger'
import autoBind from 'auto-bind'

interface SockPuppetProcess extends NodeJS.Process {
	send: (message: any, sendHandle?: any, options?: {
		swallowErrors?: boolean | undefined;
	} | undefined, callback?: ((error: Error | null) => void) | undefined) => boolean
}
type SockPuppetry = { [key: string]: (...args: any[]) => Promise<any | void> }

/*
  ? Usage:
 * class MySockPuppet extends SockPuppet {
 *  puppetry = {
 *    foo: async (bar: string) => something,
 *		bar: {
 *			baz: async (qux: number) => something
 *		}
 * 	}
 *  checkInitialize(): boolean {
 *     return true
 *  }
 *  async initialize(args: any[], success: (payload: object) => void): Promise<void> {
 * 		 success({ foo: "bar" })
 *  }
 *  constructor() {
 *     super("MySockPuppet")
 *  }
 * }
 * const puppet = new MySockPuppet()
 * puppet.deploy()
 */
export default abstract class SockPuppet extends Lumberjack {

	private readonly proc: SockPuppetProcess = <SockPuppetProcess>process;;
	private deployed: boolean = false;
	abstract puppetry: SockPuppetry;

	abstract checkInitialize(): boolean;

	abstract initialize(args: any[], success: (payload: object) => void): Promise<void>;

	protected constructor(protected name: string, logdir?: string) {
		super(name, {logdir})
		if (!process.send) throw new Error("Puppet was spawned without IPC.")
		process.title = "Aiko Mail | WS | " + this.name
		autoBind(this)
	}

	/** Deploys the SockPuppet; you cannot redeploy (must do a complete teardown). */
	public async deploy(port?: number) {
		if (this.deployed) return this.Log.error("Already deployed.")
		this.deployed = true
		const _this = this

		//? spawn websocket server
		const _port = await unused_port(port)
		const wss = new Server({ port: _port })
		this.proc.send({ port: _port, })
		wss.on("connection", (ws: WebSocket) => {

			const succ = (id: string): ((payload: object) => void) => {
				return (payload: object): void => ws.send(JSON.stringify({
					success: true,
					payload, id
				}))
			}
			const err = (id: string): ((msg: string) => void) => {
				return (msg: string): void => ws.send(JSON.stringify({
					error: msg + '\n' + (new Error),
					payload: {},
					success: false,
					id
				}))
			}

			ws.on('message', async (m: string): Promise<any> => {
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

					const {
						id,
						action,
						args
					}: {
						id: string,
						action: string,
						args: any[]
					} = JSON.parse(m.slice('please '.length))

					if (!id) return _this.Log.error("No ID provided to sock puppet.")
					if (!action) return _this.Log.error("No action provided to sock puppet.")
					if (!Array.isArray(args)) return _this.Log.error("Args not provided to sock puppet as array.")

					const success = succ(id)
					const error = err(id)

					if (!(_this.checkInitialize() || action === 'init'))
						return error("Pantheon has not yet been initialized.")

					const attempt = async (method: (...xs: any) => Promise<any> | any) => {
						try {
							const result = await method(...args)
							return success(result)
						} catch (e) {
							_this.Log.error(e)
							if (typeof e === 'string') return error(e)
							else if (e instanceof Error) return error(e.message)
							else return error(JSON.stringify(e))
						}
					}

					if (action === 'init') return await _this.initialize(args, success)
					if (action in _this.puppetry) return await attempt(_this.puppetry[action])
					else return error("No such binding: " + action)

				} catch (e) {
					return ws.send(JSON.stringify({
						error: e + '\n' + (new Error)
					}))
				}
			})
		})
	}

}