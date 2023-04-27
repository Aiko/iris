import type { Chiton } from "@Chiton/app"
import DwarfStar from "./generic/dwarf-star"
import { systemPreferences } from "electron"
import type ISettingsV1 from "./types/settings/v1"
import type ISettingsV2 from "./types/settings/v2"

type ISettings = ISettingsV2

export default class SettingsStore extends DwarfStar<ISettings> {

	readonly VERSION = 2

	// TODO: refactor into mutation observer
	get settings() { return this.state! }
	set settings(s: ISettings) {
		this.state = s
		this.Log.log("Updated settings")
		this.save()
	}

	migrations = {
		2: (state: ISettingsV1): ISettingsV2 => ({
			...state,
			appearance: {
				accentColor:
					process.platform == "darwin" ?
						systemPreferences.getAccentColor()
						: "#486fff",
				theme: "auto",
			},
		})
	}

	constructor(chiton: Chiton) {
		super(chiton, 'Settings', 'settings.json')
		try {
			this.Log.log("Attempting to load settings...")
			this.reset(this.VERSION)
		} catch {
			this.Log.log("Settings not found. Initializing...")
			this.state = {
				version: this.VERSION,
				auth: {
					authenticated: false,
					token: "",
					credentials: {
						email: "",
						password: ""
					}
				},
				meta: {
					firstTime: true
				},
				appearance: {
					accentColor:
						process.platform == "darwin" ?
							systemPreferences.getAccentColor()
							: "#486fff",
					theme: "auto"
				},
				inbox: {
					appearance: {
						fullscreen: false
					}
				},
				calendar: {
					appearance: {
						fullscreen: false
					}
				}
			}
			this.save()
		}
	}
}