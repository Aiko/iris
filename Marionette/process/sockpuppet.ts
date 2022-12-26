import Forest from '@Iris/utils/logger'
import type { LumberjackEmployer, Logger } from '@Iris/utils/logger'
import autoBind from 'auto-bind'

interface SockPuppetProcess extends NodeJS.Process {
	send: (message: any, sendHandle?: any, options?: {
		swallowErrors?: boolean | undefined;
	} | undefined, callback?: ((error: Error | null) => void) | undefined) => boolean
}
type SockPuppetry = {[key: string]: (...args: any[]) => Promise<any | void>}


export default abstract class SockPuppet {

	private readonly proc: SockPuppetProcess = <SockPuppetProcess>process;;
	private deployed: boolean = false;
	protected readonly Log: Logger;
	abstract puppetry: SockPuppetry;

	private psucc(id: string): (payload: object) => boolean {
		const proc = this.proc
		return (payload: object): boolean => proc.send(JSON.stringify({
			success: true,
			payload, id
		}))
	}

	private perr(id: string): (msg: string) => boolean {
		const proc = this.proc
		return (msg: string): boolean => proc.send(JSON.stringify({
			error: msg + '\n' + (new Error),
			payload: {},
			success: false,
			id
		}))
	}

	abstract checkInitialize(): boolean;

	abstract initialize(args: any[], success: (payload: object) => boolean): Promise<void>;

	protected constructor(protected name: string, logdir?: string) {
		const forest: Forest = new Forest(logdir)
		const Lumberjack: LumberjackEmployer = forest.Lumberjack
		this.Log = Lumberjack(this.name)
		if (!process.send) this.Log.error("Process was spawned without IPC and is now likely in a BAD state.")
		process.title = "Aiko Mail | IPC | " + this.name
		autoBind(this)
	}

	/** Deploys the SockPuppet; you cannot redeploy (must do a complete teardown). */
	public deploy() {
		if (this.deployed) return this.Log.error("Already deployed.")
		this.deployed = true
		const _this = this

		this.proc.on('message', async (m: string): Promise<any> => {
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

				const success = _this.psucc(id)
				const error = _this.perr(id)

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
				return _this.proc.send(JSON.stringify({
					error: e + '\n' + (new Error)
				}))
			}
		})
	}

}