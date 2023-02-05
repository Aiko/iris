import type { Chiton } from "@Chiton/app"
import DwarfStar from "./generic/dwarf-star"

interface ISettings {

  version: number

  auth: {
    authenticated: boolean
    token: string
    credentials: {
      email: string
      password: string
    }
  }

  meta: {
    firstTime: boolean
  }

	inbox: {
		appearance: {
			fullscreen: boolean
		}
	}

	calendar: {
		appearance: {
			fullscreen: boolean
		}
	}

}

export default class SettingsStore extends DwarfStar<ISettings> {

	// TODO: refactor into mutation observer
	get settings() { return this.state! }
	set settings(s: ISettings) {
		this.state = s
		this.save()
	}

	constructor(chiton: Chiton) {
		super(chiton, 'Settings', 'settings.json')
		this.state = {
      version: 1,
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