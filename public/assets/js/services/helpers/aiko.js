// NOTE: this module relies on ipc.js being loaded FIRST
// Without ipc.js loaded first the ipcRenderer calls will fail
const AIKOAPI_TAG = ['%c[AIKO API]', 'background-color: #4b74ff; color: #fff;']

const aikoapi = {
  data: {
    profile: {
      name: '',
      confirmed: false,
      pictureURI: '',
      email: '',
      period_ends: null, // this needs to manually be turned into a date object
      mailboxes: [{
        boards: [{
          name: ''
        }],
        email: '',
        events: []
      }],
      team: {
        name: '',
        planName: '',
        paymentMethod: '',
        accentColor: '486fff',
        pictureURI: '',
        team: [{
          member: {
            name: '',
            confirmed: false,
            pictureURI: '',
            email: '',
            created: null // this needs to manually be turned into a date object
          },
          role: ''
        }]
      }
    },
    token: ''
  },
  methods: {
    // Convenience
    async initAPI (token) {
      // USAGE:
      // const { token } = await ipcRenderer.invoke('get preferences', ['token'])
      // await this.initAPI(token)

      this.token = token
      if ((await this.fetchProfile()).error) {
        const { email, password } = DwarfStar.settings().auth.credentials
        // FIXME: remove this
        return 'FIXME: fake token'
        return await this.login(email, password)
      }
      return this.token
    },
    // USER API
    async fetchProfile () {
      info(...(AIKOAPI_TAG), 'Attempting to fetch user profile.')
      if (!this.token) {
        error(...(AIKOAPI_TAG), 'Tried to fetch user profile but no token has been retrieved.')
        return { error: 'Never signed in' }
      }
      try {
        const d = await post('/v3/me', {}, this.token)
        if (!d || d.error) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }

        this.profile = d

        // manually form Date objects for later use
        this.profile.period_ends = new Date(this.profile.period_ends)
        this.profile.team.team = await Promise.all(this.profile.team.team.map(async tm => {
          tm.member.created = new Date(tm.member.created)
          tm.member.avatar = await tm.member.email.getAvatar()
          return tm
        }))

        success(...(AIKOAPI_TAG), 'Fetched user profile.')
        return true
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return e
      }
    },
    async signup (email) {
      info(...(AIKOAPI_TAG), 'Attempting to sign up with email:', email)
      try {
        this.profile.email = email
        const d = await post('/v3/signup', {
          email: this.profile.email
        })
        if (!d || d.error || !d.accessToken) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }
        this.token = d.accessToken
        success(...(AIKOAPI_TAG), 'Successfully signed up with email:', email)
        return this.token
        // NOTE: this doesn't call fetch profile as the user should confirm email first
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return null
      }
    },
    async login (email, password) {
      info(...(AIKOAPI_TAG), 'Attempting to log in to account with email:', email)
      try {
        this.profile.email = email
        const d = await post('/v3/login', {
          email: this.profile.email,
          password: password
        })
        if (!d || d.error || !d.accessToken) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }
        this.token = d.accessToken
        await DwarfStar.save({auth: {token,}})
        success(...(AIKOAPI_TAG), 'Logged into account with email:', email)
        await this.fetchProfile()
        return this.token
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return null
      }
    },
    async register (email, password) {
      // FIXME: before using this, please make sure the registration token from the page is loaded into the vue app
      // this can be done in a script snippet:
      // <script>app.token = window.location.hash</script>
      info(...(AIKOAPI_TAG), 'Attempting to register account with email:', email)
      if (!this.token) return error(...(AIKOAPI_TAG), 'Tried to register account but no token has been retrieved.')
      let companyName; let companyColor; let companyLogo = null
      if (this.profile.team) {
        companyName = this.profile.team.name
        companyColor = this.profile.team.accentColor
        companyLogo = this.profile.team.pictureURI
      }
      try {
        this.profile.email = email
        const d = await post('/v3/account/register', {
          name: this.profile.name,
          email,
          password,
          companyName,
          companyLogo,
          companyColor
        })
        if (!d || d.error || !d.accessToken) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }
        this.token = d.accessToken
        success(...(AIKOAPI_TAG), 'Registered account with email:', email)
        await this.fetchProfile()
        return this.token
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return null
      }
    },
    async updateProfile () {
      info(...(AIKOAPI_TAG), 'Attempting to update user profile.')
      if (!this.token) return error(...(AIKOAPI_TAG), 'Tried to update user profile but no token has been retrieved.')
      try {
        const d = await post('/v3/account/update', {
          name: this.profile.name,
          email: this.profile.email
        }, this.token)
        if (!d || d.error) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }

        success(...(AIKOAPI_TAG), 'Updated user profile.')
        await this.fetchProfile()
        return true
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return e
      }
    },
    async changePassword (oldPassword, newPassword) {
      info(...(AIKOAPI_TAG), 'Attempting to change password.')
      if (!this.token) return error(...(AIKOAPI_TAG), 'Tried to change password but no token has been retrieved.')
      try {
        const d = await post('/v3/account/update', {
          name: this.profile.name,
          email: this.profile.email,
          password: oldPassword,
          newPassword
        }, this.token)
        if (!d || d.error) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }

        success(...(AIKOAPI_TAG), 'Changed password.')
        await this.fetchProfile()
        return true
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return e
      }
    },
    async deleteAccount (email, password) {
      // FIXME: this is not currently exposed on our server
      info(...(AIKOAPI_TAG), 'Attempting to delete account.')
      if (!this.token) return error(...(AIKOAPI_TAG), 'Tried to delete account but no token has been retrieved.')
      try {
        const d = await post('/v3/account/delete', {
          email, password
        }, this.token)
        if (!d || d.error) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }
        success(...(AIKOAPI_TAG), 'Deleted account.')
        this.profile = {
          name: '',
          confirmed: false,
          pictureURI: '',
          email: '',
          period_ends: null, // this needs to manually be turned into a date object
          mailboxes: [{
            boards: [{
              name: ''
            }],
            email: '',
            events: []
          }],
          team: [{
            member: {
              name: '',
              confirmed: false,
              pictureURI: '',
              email: '',
              created: null // this needs to manually be turned into a date object
            },
            role: ''
          }]
        }
        this.token = ''
        return true
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return e
      }
    },
    /*
            We don't expose the forgot password and
            reset password endpoints through this
            mixin. Those are considered extra secure
            and so should not be interfaced outside
            of Aiko's actual website at any point.
        */
    // TEAM API
    async updateTeam () {
      info(...(AIKOAPI_TAG), 'Attempting to update team with id:', this.profile.team._id)
      if (!this.token) return error(...(AIKOAPI_TAG), 'Tried to update team but no token has been retrieved.')
      try {
        const d = await post('/v3/team/update', {
          name: this.profile.team.name,
          color: this.profile.team.accentColor,
          pic: this.profile.team.pictureURI
        }, this.token)
        if (!d || d.error) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }

        success(...(AIKOAPI_TAG), 'Updated team with name:', this.profile.team.name)
        return await this.fetchProfile()
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return false
      }
    },
    async inviteToTeam (emails) {
      info(...(AIKOAPI_TAG), 'Attempting to invite new users with emails:', emails)
      if (!this.token) return error(...(AIKOAPI_TAG), 'Tried to invite to team but no token has been retrieved.')
      try {
        const d = await post('/v3/team/invite', {
          emails
        }, this.token)
        if (!d || d.error) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }

        success(...(AIKOAPI_TAG), 'Added users with emails:', emails)
        return await this.fetchProfile()
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return false
      }
    },
    async removeFromTeam (memberId) {
      info(...(AIKOAPI_TAG), 'Attempting to remove user from team:', memberId)
      if (!this.token) return error(...(AIKOAPI_TAG), 'Tried to remove from team but no token has been retrieved.')
      try {
        const d = await post('/v3/team/remove', {
          memberId
        }, this.token)
        if (!d || d.error) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }

        success(...(AIKOAPI_TAG), 'A user was removed from the team, the user has id:', memberId)
        return await this.fetchProfile()
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return false
      }
    },
    async promoteToAdmin (memberId) {
      info(...(AIKOAPI_TAG), 'Attempting to promote user in team to admin:', memberId)
      if (!this.token) return error(...(AIKOAPI_TAG), 'Tried to promote to admin but no token has been retrieved.')
      try {
        const d = await post('/v3/team/promote', {
          memberId
        }, this.token)
        if (!d || d.error) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }

        success(...(AIKOAPI_TAG), 'A user was promoted to admin, the user has id:', memberId)
        return await this.fetchProfile()
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return false
      }
    },
    async demoteToMember (memberId) {
      info(...(AIKOAPI_TAG), 'Attempting to demote user in team to member:', memberId)
      if (!this.token) return error(...(AIKOAPI_TAG), 'Tried to demote to member but no token has been retrieved.')
      try {
        const d = await post('/v3/team/demote', {
          memberId
        }, this.token)
        if (!d || d.error) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }

        success(...(AIKOAPI_TAG), 'A user was demoted to member, the user has id:', memberId)
        return await this.fetchProfile()
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return false
      }
    },
    /*
            TODO: add billing as a separate component in settings to process upgrades
        */
    async addMailbox (email) {
      info(...(AIKOAPI_TAG), 'Attempting to add a new mailbox with email:', email)
      if (!this.token) return error(...(AIKOAPI_TAG), 'Tried to add mailbox but no token has been retrieved.')
      try {
        const d = await post('/v3/mailboxes/create', {
          email
        }, this.token)
        if (!d || d.error) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }

        success(...(AIKOAPI_TAG), 'Added mailbox with email:', email)
        return await this.fetchProfile()
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return false
      }
    },
    async deleteMailbox (mailboxId) {
      info(...(AIKOAPI_TAG), 'Attempting to delete a mailbox with id:', mailboxId)
      if (!this.token) return error(...(AIKOAPI_TAG), 'Tried to delete mailbox but no token has been retrieved.')
      try {
        const d = await post('/v3/mailboxes/delete', {
          mailboxId
        }, this.token)
        if (!d || d.error) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }

        success(...(AIKOAPI_TAG), 'Deleted mailbox with id:', mailboxId)
        return await this.fetchProfile()
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return false
      }
    },
    async makeTracker (mid, to, subject) {
      info(...(AIKOAPI_TAG), 'Attempting to make a tracker for message from', to, 'with subject', subject, '\n>>> MID:', mid)
      if (!this.token) return error(...(AIKOAPI_TAG), 'Tried to make tracker but no token has been retrieved.')
      try {
        const d = await post('/v3/pixies/create', {
          mid,
          to,
          subject,
          mailboxId: this.mailbox._id
        }, this.token)
        if (!d || d.error || !d.success) {
          error(...(AIKOAPI_TAG), d.error)
          return false
        }

        const pixId = d.pix
        if (!d.pix) {
          error(...(AIKOAPI_TAG), 'Tracker creation did not return error but did not return pixel ID either!')
          return false
        }

        success(...(AIKOAPI_TAG), 'Made tracker with id:', pixId)
        return pixId
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return false
      }
    },
    async updateBoards () {
      info(...(AIKOAPI_TAG), 'Attempting to update boards.')
      if (!this.token) return error(...(AIKOAPI_TAG), 'Tried to update boards but no token has been retrieved.')
      try {
        const d = await post('/v3/mailboxes/boards', {
          mailboxId: this.mailbox._id,
          boards: this.mailbox.boards.map(board => {
            return {
              _id: board._id,
              name: board.name
            }
          })
        }, this.token)
        if (!d || d.error) {
          error(...(AIKOAPI_TAG), d.error)
          return { error: d.error || 'unknown' }
        }

        success(...(AIKOAPI_TAG), 'Updated boards.')
        return await this.fetchProfile()
      } catch (e) {
        error(...(AIKOAPI_TAG), e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
          error(...(AIKOAPI_TAG), 'App is not online!')
        }
        return false
      }
    }
  }
}
