import type { Chiton } from "@Chiton/app"
import DwarfStar from "@Chiton/store/generic/dwarf-star"
import { systemPreferences } from "electron"
import type ISettingsV1 from "@Chiton/store/types/settings/v1"
import type ISettingsV2 from "@Chiton/store/types/settings/v2"
import type ISettingsV3 from "@Chiton/store/types/settings/v3"

export type ISettings = ISettingsV3

export default class SettingsStore extends DwarfStar<ISettings> {

	readonly VERSION = 3

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
		}),
		3: (state: ISettingsV2): ISettingsV3 => ({
			...state,
			accessibility: {
				language: "en",
			},
		}),
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