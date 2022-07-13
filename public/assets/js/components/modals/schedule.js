Vue.component('schedule-modal', {
  data () {
    return {
      scheduleText: null,
      scheduleTime: new Date(),
      scheduleToCalendar: false,
    }
  },
  async created() {
    info(...FLOW_TAG, "Opening scheduling modal")
    const email = this.$root.flow.scheduleSeed
    this.scheduleTime = new Date(email.M.quick_actions.scheduling?.start ?? (new Date()))
    info(...FLOW_TAG, "Scheduling initial date", this.scheduleTime)
    this.scheduleTime.setMinutes(this.scheduleTime.getMinutes() - this.scheduleTime.getTimezoneOffset())
    this.scheduleTime = this.scheduleTime.toISOString().slice(0, 16)
    this.scheduleText = email.M.quick_actions.scheduling?.subject ||
      email.M.quick_actions.context ||
      this.scheduleTime.toNicerDateTime()
    ;;
  },
  methods: {
    normalizeAddresses(addresses) {
      return addresses.map(({ name, address}) => {
        return {
          display: name, value: address
        }
      })
    },
    async compose () {
      const email = this.$root.flow.scheduleSeed
      info(...FLOW_TAG, 'Composing:', this.scheduleTime)
      const cc =  this.normalizeAddresses(email.M.envelope.cc)
      const to = this.normalizeAddresses(
        [email.M.envelope.from, ...email.M.envelope.to] //? don't need to check if it's one you sent bc of below
          .filter(({ address }) => address != this.$root.currentMailbox) //? don't reply to yourself lol
      )
      const bcc = this.normalizeAddresses(email.M.envelope.bcc)
      if (bcc.length > 0 && to.length > 1) {
        // TODO: should show a warning that you were BCC'ed
      }
      const date = new Date(this.scheduleTime)
      //? Turn date into friendly language
      const dateString = date.toNicerDateTime()
      this.$root.openComposer(
        withTo=to,
        withCC=cc,
        withBCC=[],
        withSubject="Re: " + email.M.envelope.subject,
        withQuoted='',
        withMessageId=email.M.envelope.mid,
        withContent=`Thanks for getting back to me! I think ${dateString} would work best for me. Let me know if this works for you.`,
        withReferences=email.M.envelope.references ?? [],
      )
      this.close()
    },
    async close () {
      this.$root.flow.scheduleSeed = null
    }
  }
})
