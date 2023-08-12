import WebSocket, { Server } from 'ws'
import { unused_port, RESERVED_PORTS } from '@Iris/common/port'
import Forest, { Lumberjack } from '@Iris/common/logger'
import autoBind from 'auto-bind'
import stratify from '@Iris/common/stratify'

interface SockPuppetProcess extends NodeJS.Process {
	send: (message: any, sendHandle?: any, options?: {
		swallowErrors?: boolean | undefined;
	} | undefined, callback?: ((error: Error | null) => void) | undefined) => boolean
}
type SockPuppetryMethod = ((...args: any[]) => Promise<any | void> | any | void)
type SockPuppetry = {
	[key: string]: SockPuppetryMethod | SockPuppetry
}

/*
  ! Warning: Until this is deployed, the socket doesn't exist.
	! Also, you can't expect port to be defined prior to deployment unless you pass it in.
	! It's left unprotected to allow for more complex use cases.
	! e.g. for Window management, the Window launch & load will take longer than the SockPuppet deployment.
	! So for Window management, you could expect port/socket to be reliably defined.
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

	private readonly proc: SockPuppetProcess | null
	private deployed: boolean = false;
	private readonly websockets: WebSocket[] = []
	abstract puppetry: SockPuppetry;
	private API: {[key: string]: SockPuppetryMethod} = {}

	protected abstract checkInitialize(): boolean;

	protected abstract initialize(args: any[], success: (payload: object) => void): Promise<void>;

	/** should do renderer=true if you want it to run forked */
	protected constructor(
		protected name: string,
		opts: {
			forest?: Forest | undefined,
			logdir?: string | undefined,
			renderer?: boolean
		},
		private _port?: number,
	) {
		super(name, opts)

		if (opts.renderer) {
			process.title = "Aiko Mail | WS | " + this.name
			this.proc = <SockPuppetProcess>process;;
		} else this.proc = null

		autoBind(this)
	}

	/** Slight safety mechanism to prevent bad accesses */
	public get port(): number {
		if (!(this.deployed)) this.Log.error("Cannot get port before deployment.")
		if (!(this._port)) this.Log.error("Port not defined.")
		return this._port!
	}

	/** Deploys the SockPuppet; you cannot redeploy (must do a complete teardown). */
	public async deploy() {
		if (this.deployed) return this.Log.error("Already deployed.")
		this.deployed = true
		const _this = this

		//? compile puppetry
		this.API = stratify(this.puppetry)

		//? spawn websocket server
		this._port = await unused_port(this._port)
		const wss = new Server({ port: this._port })
		if (this.proc) this.proc.send({ port: this._port, })
		wss.on("connection", (ws: WebSocket) => {

			const succ = (id: string): ((payload?: object) => void) => {
				return (payload?: object): void => ws.send(JSON.stringify({
					success: true,
					payload: payload ?? {},
					id
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

			_this.websockets.push(ws)

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
						return error("Puppet has not yet been initialized.")

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
					if (action in _this.API) return await attempt(_this.API[action] as SockPuppetryMethod)
					else return error("No such binding: " + action + " in API:\n" + JSON.stringify(_this.API, null, 2))
				} catch (e) {
					return ws.send(JSON.stringify({
						error: e + '\n' + (new Error)
					}))
				}
			})
		})
	}

	/** Trigger an event on all puppeteers */
	protected trigger(event: string, payload: any) {
		if (!this.deployed) return this.Log.error("Cannot trigger event before deployment.")
		this.websockets.map(ws => ws.send(JSON.stringify({
			event, payload
		})))
	}

}