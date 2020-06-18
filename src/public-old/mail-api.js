// this is a mixin because it has no template or component to attach to
// it could be its own class but it's more useful as a mixin

const mail_api_mixin = {
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
    },
    token: ''
  },
  methods: {
    async getProfile (token) {
      try {

      } catch (e) {
        console.error(e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
        }
        return e
      }
    },
    async login (email, password) {
      try {
        this.email = email
        const d = await post('/v3/login', {
          email: this.email,
          password: password
        })
        if (!d || d.error || !d.accessToken) {
          return null
        }
        this.token = d.accessToken
        return this.token
      } catch (e) {
        console.error(e)
        return null
      }
    },
    async fetchProfile () {
      try {
        const d = await post('/v3/me', {}, this.token)
        if (!d || d.error) return false

        this.name = d.name
        this.email = d.email
        this.confirmed = d.confirmed
        this.pictureURI = d.pictureURI
        this.period_ends = d.period_ends
        this.mailboxes = d.mailboxes
        this.team = d.team
        return true
      } catch (e) {
        console.error(e)
        if (e.message == 'Failed to fetch') {
          app.isOnline = false
        }
        return e
      }
    },
    async addMailbox (email) {
      try {
        const d = await post('/v3/mailboxes/create', {
          email: email
        }, this.token)
        if (!d || d.error) return false

        return await this.fetchProfile()
      } catch (e) {
        console.error(e)
        return false
      }
    },
    async makeTracker (mid, to, subject) {
      try {
        const d = await post('/v3/pixies/create', {
          mid: mid,
          to: to,
          subject: subject,
          mailboxId: this.mailbox._id
        }, this.token)
        if (!d || d.error || !d.success) return false

        return d.pix
      } catch (e) {
        console.error(e)
        return false
      }
    },
    async updateBoards () {
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
        if (!d || d.error) return false

        await this.fetchProfile()
        this.fetching = true
        await this.switchToMailbox(this.mailboxes.filter(mailbox => mailbox.email == this.mailbox.email)[0])
      } catch (e) {
        console.error(e)
        return false
      }
    }
  }
}
