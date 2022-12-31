import type { Chiton } from "@Chiton/app";
import { Window } from "@Chiton/components/window";
import { RESERVED_PORTS } from "@Iris/common/port";

export class Inbox extends Window {

	puppetry = {
		window: {
			...(this.windowPuppetry),
			setFullScreen: this.setFullScreen
		}
	}

	checkInitialize(): boolean {
		return true
	}
	async initialize(args: any[], success: (payload: object) => void) {
		success({})
	}

	//? persist fullscreen status
	setFullScreen(s: boolean) {
		super.setFullScreen(s)
		const settings = this.chiton.settingsStore.settings
		settings.inbox.appearance.fullscreen = s
		this.chiton.settingsStore.settings = settings
		return true
	}

	constructor(chiton: Chiton, {
		demoMode=false
	}: {
		demoMode?: boolean,
	}={}) {
		super(chiton, "Inbox", {
			closable: false
		})

		if (demoMode || chiton.settingsStore.get().auth.authenticated) {
			if (demoMode) this.Log.shout("Env:", process.env.NODE_ENV, "[Demo]")
			else this.Log.shout("Env:", process.env.NODE_ENV)
			if (chiton.devMode) {
				this.loadURL(`http://localhost:${RESERVED_PORTS.VEIL}#${chiton.version_hash}`)
				this.win.webContents.openDevTools()
			} else {
				this.loadURL(`file://${__dirname}/../Veil/index.html`)
			}
		} else {
			this.Log.warn("User is not signed in, initiating login flow.")
			this.loadURL("https://aikomail.com/email/signin") //! FIXME: replace with Ovid
		}
	}

}