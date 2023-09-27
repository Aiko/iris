export default interface ISettingsV1 {

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