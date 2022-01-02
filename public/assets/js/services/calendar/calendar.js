const CALENDAR_TAG = ['%c[CALENDAR]', 'background-color: #a55; color: #000;']

const calendar = {
  data: {},
  created () {
    info(...CALENDAR_TAG, 'Mounted calendar mixin. Please ensure this only ever happens once.')
  },
  methods: {
    task_OpenCalendar (bang, provider) {
      return this.ipcTask('please open the calendar', { bang, provider })
    },
    async openCalendar () {

      // TODO: cache with randomized identifier
      const identifier = String.random(12)

      await this.executeIPC(this.task_OpenCalendar(identifier, this.imapConfig.provider))
    },
  }
}
