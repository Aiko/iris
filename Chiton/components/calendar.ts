import type { Chiton } from "@Chiton/app";
import { Window } from "@Chiton/components/window";
import { RESERVED_PORTS } from "@Iris/common/port";
import autoBind from "auto-bind";

export default class Calendar extends Window {

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
		settings.calendar.appearance.fullscreen = s
		this.chiton.settingsStore.settings = settings
		return true
	}

	constructor(chiton: Chiton) {
		const FULLSCREEN = chiton.settingsStore.settings.calendar.appearance.fullscreen ? {
			fullscreen: true
		} : {}
		super(chiton, "Calendar", {
			closable: true,
			winArgs: {
				frame: true,
				titleBarStyle: "default",
				...FULLSCREEN
			}
		})

		this.win.on('enter-full-screen', () => this.setFullScreen(true))
		this.win.on('leave-full-screen', () => this.setFullScreen(false))


		this.loadURL(`http://localhost:${RESERVED_PORTS.VEIL}/calendar`)
		this.focus()

		autoBind(this)
	}

}