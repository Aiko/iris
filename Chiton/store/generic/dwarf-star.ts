import path from 'path'
import fs2 from 'fs-extra'
import autoBind from 'auto-bind'
import SockPuppet from '@Marionette/ws/sockpuppet'
import type { Chiton } from '@Chiton/app'
import datapath from '@Iris/common/datapath'

// TODO: this should connect to Arachne to sync settings across devices

/** Persistent data-store for small state (e.g. settings) */
export default class DwarfStar<T extends object> extends SockPuppet {
	puppetry = {
		get: this.clone,
		set: this.set,
		reset: this.reset,
	}

	protected state: T | null = null
	protected checkInitialize(): boolean { return !!(this.state) }
	protected async initialize(args: any[], success: (payload: object) => void) {
		if (this.state) return this.Log.error("Already initialized.")
		this.state = args[0] as T
		success(this.save())
	}

	protected save(): T {
    fs2.writeFileSync(this.fp, JSON.stringify(this.state))
    return JSON.parse(fs2.readFileSync(this.fp, { encoding: "utf-8" })) as T
  }
	private set(state: Partial<T>): T {
		this.state = {
			...(this.state!),
			...state,
		}
		return this.save()
	}
	protected reset(): T {
    fs2.ensureFileSync(this.fp)
    const state = JSON.parse(fs2.readFileSync(this.fp, {encoding: "utf-8"})) as T
		if (!state) {
			this.Log.error("Reset failed: state is empty.")
			throw new Error("Cannot reset to empty state.")
		}
		this.state = state
    return this.save()
  }
  private clone(): T {
    return JSON.parse(JSON.stringify(this.state));
  }

	/** Utilize this only for small state. */
	constructor(
		chiton: Chiton,
		name: string,
		private readonly fp: string,
	) {
		super(name + ' (DwarfStar)', {
			forest: chiton.forest,
			renderer: false
		})

		this.fp = datapath(fp)
		autoBind(this)
	}

	public get(): T { return this.state! }
}
