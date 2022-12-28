import path from 'path'
import { fork, ChildProcess } from 'child_process'
import crypto from 'crypto'
import Forest, { Lumberjack } from '@Iris/common/logger'
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

export default abstract class SockPuppeteer extends Lumberjack {
	private API?: WebSocket
	private deployed: boolean = false;

	private readonly waiters: Record<string, SockPuppeteerWaiter> = {}
	private readonly listeners: Record<string, SockPuppeteerListener> = {}
	private readonly triggers: Record<string, SockPuppeteerTrigger> = {}

	private readonly queue: ProcessMessage[] = []
	private rotating: boolean = false
	private getID(): string {
		const id = crypto.randomBytes(6).toString('hex')
		if (this.waiters[id]) return this.getID()
		return id
	}

	/** Leaving port empty will create a child process. */
	protected constructor(protected name: string, forest: Forest, port?: number) {
		super(name, { forest })
		process.title = "Aiko Mail | WS | " + this.name
		autoBind(this)

		if (port) this.deploy(port)
		else {
			const Puppet = fork(path.join(__dirname, 'puppet.js'), [], {
				stdio: ['pipe', 'pipe', 'pipe', 'ipc']
			})
			Puppet.stdout?.pipe(process.stdout)
			Puppet.stderr?.pipe(process.stderr)

			//? Parses incoming messages then calls the relevant callbacks and notifies listeners
			Puppet.on('message', (m: string) => {
				const s = JSON.parse(m) as { port: number }
				if (!(s?.port)) return this.Log.error("No PORT specified in message")
				this.deploy(s.port)
			})
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
				this.Log.error("Unknown message type (no id or event)")
			}
		}
	}

	private async rotate() {
		if (this.queue.length > 0) {
			this.rotating = true
			const { id, msg } = this.queue.shift() as ProcessMessage //? TS didn't connx length > 0 to shift() != undefined
			this.listeners[id] = () => {
				delete this.listeners[id]
				this.rotate()
			}
			this.API!.send(msg)
		} else {
			this.rotating = false
		}
	}

	protected proxy<Fx extends (...args: any[]) => Promise<any | void>>(action: string, immediate: boolean = true) {
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
				this.API!.send('please ' + JSON.stringify(instr))
			}
		})
	}

	protected register(event: string, trigger: SockPuppeteerTrigger) {
		this.triggers[event] = trigger
	}

}
