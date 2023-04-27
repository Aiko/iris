export default interface ISettingsV2 {

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

	appearance: {
		accentColor: string
		theme: string
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