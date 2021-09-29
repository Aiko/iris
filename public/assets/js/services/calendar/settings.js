const SETTINGS_TAG = ['%c[SETTINGS]', 'background-color: #444444; color: #000;']

const settings = {
  data: {},
  created () {
    info(...SETTINGS_TAG, 'Mounted settings mixin. Please ensure this only ever happens once.')
  },
  methods: {
    task_OpenSettings (bang) {
      return this.ipcTask('please open settings', { bang })
    },
    async openSettings() {
      // TODO: somehow myake settings

      // TODO: cache with randomized identifier
      const identifier = String.random(12)

      await this.executeIPC(this.task_OpenSettings(identifier))
    },
  }
}
