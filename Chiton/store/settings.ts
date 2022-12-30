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

}

export default class SettingsStore extends DwarfStar<ISettings> {
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
      }
    }
		this.save()
	}
}