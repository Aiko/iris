import type { Chiton } from "@Chiton/app";
import { Window } from "@Chiton/components/window";
import { RESERVED_PORTS } from "@Iris/common/port";
import { ElectronBlocker } from "@cliqz/adblocker-electron";
import autoBind from "auto-bind";

export enum InboxEvents {
	UPDATE_AVAILABLE="update-available",
}

export default class Inbox extends Window {

	puppetry = {
		window: {
			...(this.windowPuppetry),
			setFullScreen: this.setFullScreen
		}
	}

	ADBLOCK_ON: boolean = false

	checkInitialize(): boolean {
		return this.ADBLOCK_ON
	}
	async initialize(args: any[], success: (payload: object) => void) {
		const adblock = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)
		adblock.enableBlockingInSession(this.win.webContents.session)
		this.ADBLOCK_ON = true
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

	onUpdateAvailable(releaseName: string, releaseNotes: string) {
		this.trigger(InboxEvents.UPDATE_AVAILABLE, {
			releaseName,
			releaseNotes,
		})
	}

	constructor(chiton: Chiton, {
		demoMode=false
	}: {
		demoMode?: boolean,
	}={}) {
		super(chiton, "Inbox", {
			closable: false,
			winArgs: {
				fullscreen: chiton.settingsStore.settings.inbox.appearance.fullscreen
			}
		})

		if (demoMode || chiton.settingsStore.get().auth.authenticated) {
			if (demoMode) this.Log.shout("Env:", process.env.NODE_ENV, "[Demo]")
			else this.Log.shout("Env:", process.env.NODE_ENV)
			if (chiton.config.devMode) {
				//this.loadURL(`http://localhost:${RESERVED_PORTS.VEIL}#${chiton.version_hash}`)
				// TODO: bind to settings
				this.loadURL(`http://localhost:${RESERVED_PORTS.VEIL}#${chiton.settingsStore.settings.appearance.accentColor}`)
				this.win.webContents.openDevTools()
			} else {
				this.loadURL(`file://${__dirname}/../Veil/index.html`)
			}
		} else {
			this.Log.warn("User is not signed in, initiating login flow.")
			this.loadURL("https://aikomail.com/email/signin") //! FIXME: replace with Ovid
		}

		this.win.on('enter-full-screen', () => this.setFullScreen(true))
		this.win.on('leave-full-screen', () => this.setFullScreen(false))

		autoBind(this)
	}

}