const MSOAUTH_TAG = ['%c[GOOGLE]', 'background-color: #67a5ff; color: #000;']

const msoauth = {
  data: {
    msftConfig: {
      profile: {
        access_token: '',
        refresh_token: '',
        expiry_date: '',
        scope: '',
      },
      email: {
        access_token: '',
        refresh_token: '',
        expiry_date: '',
        scope: '',
      }
    }
  },
  methods: {
    async msft_saveConfig () {
      await SmallStorage.store((this.imapConfig?.email || this.smtpConfig?.email) + '/msft-config', this.msftConfig)
    },
    async msft_loadConfig () {
      // must have called loadIMAPConfig or loadSMTPConfig first
      this.msftConfig = await SmallStorage.load((this.imapConfig?.email || this.smtpConfig?.email) + '/msft-config')
    },
    // Core Methods
    async msft_addMailbox () {
      info(...(MSOAUTH_TAG), 'Adding new mailbox.')
      const {
        email, profile
      } = await this.callIPC(this.ipcTask('please get microsoft oauth token', {}))

      if (!(email?.access_token) || !(profile?.access_token)) return false

      info(...(MSOAUTH_TAG), 'Fetching profile.')
      const user_profile = await (
        await fetch('https://graph.microsoft.com/v1.0/me', {
          "method": "GET",
          "headers": {
            "Authorization": `Bearer ${profile.access_token}`
          }
        })
      ).json()

      const xoauth = email.access_token

      if (this.imapConfig) {
        success(...(MSOAUTH_TAG), 'Setting up IMAP configuration.')
        this.imapConfig.email = user_profile.mail
        this.imapConfig.host = 'outlook.office365.com'
        this.imapConfig.port = 993
        this.imapConfig.xoauth2 = xoauth
        this.imapConfig.user = user_profile.mail
        this.imapConfig.pass = ''
        this.imapConfig.provider = 'outlook'
        this.imapConfig.secure = true
        await this.saveIMAPConfig()
      }

      if (this.smtpConfig) {
        success(...(MSOAUTH_TAG), 'Setting up SMTP configuration.')
        this.smtpConfig.email = user_profile.mail
        this.smtpConfig.host = 'smtp.office365.com'
        this.smtpConfig.port = 587
        this.smtpConfig.xoauth2 = xoauth
        this.smtpConfig.user = user_profile.userPrincipalName
        this.smtpConfig.pass = ''
        this.smtpConfig.provider = 'outlook'
        this.smtpConfig.secure = true
        await this.saveSMTPConfig()
      }

      success(...(MSOAUTH_TAG), 'Setting up Microsoft configuration.')
      this.msftConfig.email.access_token = email.access_token
      this.msftConfig.email.expiry_date = new Date(Date.now() + email?.expires_in * 1000)
      this.msftConfig.email.refresh_token = email?.refresh_token
      this.msftConfig.email.scope = email?.scope
      this.msftConfig.profile.access_token = profile.access_token
      this.msftConfig.profile.expiry_date = new Date(Date.now() + profile?.expires_in * 1000)
      this.msftConfig.profile.refresh_token = profile?.refresh_token
      this.msftConfig.profile.scope = profile?.scope
      await this.msft_saveConfig()

      return true
    },
    async msft_checkTokens () {
      info(...(MSOAUTH_TAG), 'Checking tokens for expiration.')
      const today = new Date()

      const expiry = new Date(this.msftConfig.email.expiry_date)
      if (today > expiry || !this.msftConfig.email.access_token) {
        info(...(MSOAUTH_TAG), 'Tokens have expired, updating them automatically.')

        info(...(MSOAUTH_TAG), 'Refreshing tokens.')
        const {
          email, profile
        } = await this.callIPC(this.ipcTask('please refresh microsoft oauth token', {
          r_token_email: this.msftConfig.email.refresh_token,
          r_token_profile: this.msftConfig.profile.refresh_token
        }))

        info(...(MSOAUTH_TAG), 'Fetching profile.')
        const user_profile = await (
          await fetch('https://graph.microsoft.com/v1.0/me', {
            "method": "GET",
            "headers": {
              "Authorization": `Bearer ${profile.access_token}`
            }
          })
        ).json()

        const xoauth = email.access_token

        if (this.imapConfig) {
          success(...(GOAUTH_TAG), 'Setting up IMAP configuration.')
          this.imapConfig.email = user_profile.mail
          this.imapConfig.host = 'outlook.office365.com'
          this.imapConfig.port = 993
          this.imapConfig.xoauth2 = xoauth
          this.imapConfig.user = user_profile.mail
          this.imapConfig.pass = ''
          this.imapConfig.secure = true // gmail uses self signed certs
          this.imapConfig.provider = 'outlook'
          await this.saveIMAPConfig()
        }

        if (this.smtpConfig) {
          success(...(GOAUTH_TAG), 'Setting up SMTP configuration.')
          this.smtpConfig.email = user_profile.mail
          this.smtpConfig.host = 'smtp.office365.com'
          this.smtpConfig.port = 587
          this.smtpConfig.xoauth2 = xoauth
          this.smtpConfig.user = user_profile.userPrincipalName
          this.smtpConfig.pass = ''
          this.smtpConfig.provider = 'outlook'
          this.smtpConfig.secure = true
          await this.saveSMTPConfig()
        }

        success(...(GOAUTH_TAG), 'Setting up Microsoft configuration.')
        this.msftConfig.email.access_token = email.access_token
        this.msftConfig.email.expiry_date = new Date(Date.now() + email?.expires_in * 1000)
        this.msftConfig.email.refresh_token = email?.refresh_token
        this.msftConfig.email.scope = email?.scope
        this.msftConfig.profile.access_token = profile.access_token
        this.msftConfig.profile.expiry_date = new Date(Date.now() + profile?.expires_in * 1000)
        this.msftConfig.profile.refresh_token = profile?.refresh_token
        this.msftConfig.profile.scope = profile?.scope
        await this.msft_saveConfig()

        if (this.reconnectToMailServer) await this.reconnectToMailServer()
      }
    },
    // TODO: need to force refresh if credentials fail on connect to mailserver
    // FIXME: this actually happens quite a bit and NEEDS to be dealt with before launch
    //* you should catch the error in reconnectToMailserver() and call this if provider == 'google'
    async msft_forceRefresh () {
      info(...(MSOAUTH_TAG), 'Forcing refresh.')
      info(...(MSOAUTH_TAG), 'Refreshing tokens.')
      const {
        email, profile
      } = await this.callIPC(this.ipcTask('please refresh microsoft oauth token', {
        r_token_email: this.msftConfig.email.refresh_token,
        r_token_profile: this.msftConfig.profile.refresh_token
      }))

      info(...(MSOAUTH_TAG), 'Fetching profile.')
      const user_profile = await (
        await fetch('https://graph.microsoft.com/v1.0/me', {
          "method": "GET",
          "headers": {
            "Authorization": `Bearer ${profile.access_token}`
          }
        })
      ).json()

      const xoauth = email.access_token

      if (this.imapConfig) {
        success(...(GOAUTH_TAG), 'Setting up IMAP configuration.')
        this.imapConfig.email = user_profile.mail
        this.imapConfig.host = 'outlook.office365.com'
        this.imapConfig.port = 993
        this.imapConfig.xoauth2 = xoauth
        this.imapConfig.user = user_profile.mail
        this.imapConfig.pass = ''
        this.imapConfig.secure = true // gmail uses self signed certs
        this.imapConfig.provider = 'outlook'
        await this.saveIMAPConfig()
      }

      if (this.smtpConfig) {
        success(...(GOAUTH_TAG), 'Setting up SMTP configuration.')
        this.smtpConfig.email = user_profile.mail
        this.smtpConfig.host = 'smtp.office365.com'
        this.smtpConfig.port = 587
        this.smtpConfig.xoauth2 = xoauth
        this.smtpConfig.user = user_profile.userPrincipalName
        this.smtpConfig.pass = ''
        this.smtpConfig.provider = 'outlook'
        this.smtpConfig.secure = true
        await this.saveSMTPConfig()
      }

      success(...(GOAUTH_TAG), 'Setting up Microsoft configuration.')
      this.msftConfig.email.access_token = email.access_token
      this.msftConfig.email.expiry_date = new Date(Date.now() + email?.expires_in * 1000)
      this.msftConfig.email.refresh_token = email?.refresh_token
      this.msftConfig.email.scope = email?.scope
      this.msftConfig.profile.access_token = profile.access_token
      this.msftConfig.profile.expiry_date = new Date(Date.now() + profile?.expires_in * 1000)
      this.msftConfig.profile.refresh_token = profile?.refresh_token
      this.msftConfig.profile.scope = profile?.scope
      await this.msft_saveConfig()

      if (this.reconnectToMailServer) await this.reconnectToMailServer()
    }
  }
}
