import path from 'path'
import fs2 from 'fs-extra'
import autoBind from 'auto-bind'
import SockPuppet from '@Marionette/ws/sockpuppet'
import type { Chiton } from '@Chiton/app'

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
	private reset(): T {
    fs2.ensureFileSync(this.fp)
    const state = JSON.parse(fs2.readFileSync(this.fp, {encoding: "utf-8"})) as T
		if (!(this.checkInitialize())) {
			this.Log.error("Reset failed: state is empty.")
			throw new Error("Cannot reset against empty state.")
		}
		this.state = state
    return this.save()
  }
  private clone(): T {
    return JSON.parse(JSON.stringify(this.state));
  }

	constructor(
		chiton: Chiton,
		name: string,
		private readonly fp: string,
	) {
		super(name + ' (DwarfStar)', {
			forest: chiton.forest,
			renderer: false
		})

		switch (process.platform) {
      case 'darwin': fp = path.join(process.env.HOME || "~", "Library", "Application Support", "Aiko Mail", fp); break
      case 'win32': fp = path.join(process.env.APPDATA || "/c/", "Aiko Mail", fp); break
      case 'linux': fp = path.join(process.env.HOME || "~", ".Aiko Mail", fp); break
    }

		autoBind(this)
	}

	public get(): T { return this.state! }
}
