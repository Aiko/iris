import type { Logger, LumberjackEmployer } from '@Iris/common/types'
import autoBind from 'auto-bind'

interface SockPuppeteerWaiterParams {
	success: boolean,
	payload: any,
	error?: string,
	id: string
}
interface SockPuppeteerTriggerParams {
	event: string
	payload?: any
}
const isWaiter = (t: SockPuppeteerWaiterParams | SockPuppeteerTriggerParams): t is SockPuppeteerWaiterParams =>
	!!((t as SockPuppeteerWaiterParams).id);
const isTrigger = (t: SockPuppeteerWaiterParams | SockPuppeteerTriggerParams): t is SockPuppeteerTriggerParams =>
	!!((t as SockPuppeteerTriggerParams).event);

type SockPuppeteerWaiter = (_: SockPuppeteerWaiterParams) => void
type SockPuppeteerListener = () => void
type SockPuppeteerTrigger = (() => void) | ((_: any) => void) | (() => Promise<void>) | ((_: any) => Promise<void>)

type ValueType<T> =
	T extends Promise<infer U>
	? U
	: T;;

type ProcessMessage = { id: string, msg: string }

export default abstract class SockPuppeteer {
	private API?: WebSocket
	protected Log: Logger
	private deployed: boolean = false;

	private readonly waiters: Record<string, SockPuppeteerWaiter> = {}
	private readonly listeners: Record<string, SockPuppeteerListener> = {}
	private readonly triggers: Record<string, SockPuppeteerTrigger> = {}

	private readonly queue: ProcessMessage[] = []
	private rotating: boolean = false

	private randHex: () => string =
		() => { throw new Error("Sockpuppeteer initialized without access to random hexes.") }
	private getID(): string {
		const id = this.randHex()
		if (this.waiters[id]) return this.getID()
		return id
	}

	/** Leaving port empty will create a child process. */
	protected constructor(protected name: string, opts: {
		logger?: Logger,
		employer?: LumberjackEmployer,
	}, port?: number) {
		autoBind(this)

		this.Log = (() => {
      if (!opts.logger) {
        if (!opts.employer) throw new Error("Must provide either logger or employer")
        return opts.employer(this.name)
      }
      return opts.logger
    })();;

		if (port) {
			this.randHex = () => String.random(6)
			this.deploy(port)
		} else {
			const _this = this
			;(async () => {
				process.title = "Aiko Mail | WS | " + this.name
				const crypto = await import('crypto')
				this.randHex = () => crypto.randomBytes(6).toString('hex')
				const path = await import('path')
				const { fork } = await import('child_process')
				const Puppet = fork(path.join(__dirname, 'puppet.js'), [], {
					stdio: ['pipe', 'pipe', 'pipe', 'ipc']
				})
				Puppet.stdout?.pipe(process.stdout)
				Puppet.stderr?.pipe(process.stderr)

				//? Parses incoming messages then calls the relevant callbacks and notifies listeners
				Puppet.on('message', (m: string) => {
					const s = JSON.parse(m) as { port: number }
					if (!(s?.port)) return _this.Log.error("No PORT specified in message")
					_this.deploy(s.port)
				})
			})();
		}

		autoBind(this)
	}

	private async deploy(port: number) {
		if (this.deployed) return this.Log.error("Already deployed.")
		this.deployed = true
		// connect to websocket on port s.port
		const ws = new WebSocket(`ws://localhost:${port}`)
		this.API = ws
		ws.binaryType = 'arraybuffer'
		ws.onmessage = (m: MessageEvent<string>): any => {
			const s = JSON.parse(m.data) as (SockPuppeteerWaiterParams | SockPuppeteerTriggerParams)
			if (isTrigger(s)) {
				const cb = this.triggers[s.event]
				if (!cb) return this.Log.warn("No trigger set for", s.event)
				cb(s.payload)
			} else if (isWaiter(s)) {
				const cb = this.waiters[s.id]
				if (!cb) return this.Log.error("No waiter set.")
				const listener = this.listeners[s.id]
				if (listener) listener()
				cb(s)
			} else {
				this.Log.error("Unknown message type (no id or event)", s)
			}
		}
	}

	private async send(msg: string) {
		const _this = this
		return await new Promise<void>((s, _) => {
			// wait for readyState = 1
			if (this.API!.readyState === 1) s(_this.API!.send(msg))
			else setTimeout(() => _this.send(msg).then(s), 100)
		})
	}

	private async rotate() {
		if (this.queue.length > 0) {
			this.rotating = true
			const { id, msg } = this.queue.shift() as ProcessMessage //? TS didn't connx length > 0 to shift() != undefined
			this.listeners[id] = () => {
				delete this.listeners[id]
				this.rotate()
			}
			this.send(msg)
		} else {
			this.rotating = false
		}
	}

	protected proxy<Fx extends (...args: any[]) => void | any | Promise<any | void>>(action: string, immediate: boolean = true) {
		return (...args: Parameters<Fx>): Promise<ValueType<ReturnType<Fx>>> => new Promise((s, _) => {
			const id = this.getID()
			const instr = { id, action, args }

			const cb: SockPuppeteerWaiter = ({ success, payload, error }: {
				success: boolean,
				payload: ValueType<ReturnType<Fx>>,
				error?: string
			}) => {
				if (error || !success) {
					this.Log.error(id, '|', error || 'Failed without error.')
					_()
				}
				else s(payload)
				delete this.waiters[id]
			}

			this.waiters[id] = cb

			if (!immediate) {
				this.queue.push({
					id, msg: 'please ' + JSON.stringify(instr)
				})
				if (!this.rotating) this.rotate()
			} else {
				this.send('please ' + JSON.stringify(instr))
			}
		})
	}

	public async init(...args: any[]) {
		await this.proxy("init")(...args)
	}

	protected register(event: string, trigger: SockPuppeteerTrigger) {
		this.triggers[event] = trigger
	}

}
