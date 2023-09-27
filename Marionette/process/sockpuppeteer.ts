import path from 'path'
import { fork, ChildProcess } from 'child_process'
import crypto from 'crypto'
import Forest, { Lumberjack } from '@Iris/common/logger'
import autoBind from 'auto-bind'

type SockPuppeteerWaiterParams = {
	success: boolean,
	payload: any,
	error?: string,
	id: string
}
type SockPuppeteerWaiter = (_: SockPuppeteerWaiterParams) => void
type SockPuppeteerListener = () => void

type ValueType<T> =
	T extends Promise<infer U>
	? U
	: T;;

type ProcessMessage = { id: string, msg: string }

export default abstract class SockPuppeteer extends Lumberjack {
	private readonly API: ChildProcess
	private deployed: boolean = false;

	private readonly waiters: Record<string, SockPuppeteerWaiter> = {}
	private readonly listeners: Record<string, SockPuppeteerListener> = {}
	private readonly queue: ProcessMessage[] = []
	private rotating: boolean = false
	private getID(): string {
		const id = crypto.randomBytes(6).toString('hex')
		if (this.waiters[id]) return this.getID()
		return id
	}

	/** Will fork a new process every time. */
	protected constructor(protected name: string, forest: Forest) {
		super(name, { forest })
		process.title = "Aiko Mail | IPC | " + this.name

		this.API = fork(path.join(__dirname, 'puppet.js'), [], {
			stdio: ['pipe', 'pipe', 'pipe', 'ipc']
		})
		this.API.stdout?.pipe(process.stdout)
		this.API.stderr?.pipe(process.stderr)
		autoBind(this)
	}

	public deploy() {
		if (this.deployed) return this.Log.error("Already deployed.")
		this.deployed = true

		//? Parses incoming messages then calls the relevant callbacks and notifies listeners
		this.API.on('message', (m: string) => {
			const s = JSON.parse(m) as SockPuppeteerWaiterParams
			if (!(s?.id)) return this.Log.error("No ID in received message")
			const cb = this.waiters[s.id]
			if (!cb) return this.Log.error("No waiter set.")
			const listener = this.listeners[s.id]
			if (listener) listener()
			cb(s)
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
			this.API.send(msg)
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
				this.API.send('please ' + JSON.stringify(instr))
			}
		})
	}
}
