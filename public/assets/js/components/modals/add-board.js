Vue.component('add-board-modal', {
  data () {
    return {
      name: ''
    }
  },
  computed: {
    validBoard () {
      return !(this.$root.boardOrder.includes(this.name))
    }
  },
  methods: {
    async addBoard () {
      info(...MODALS_TAG, 'Making a new board with title:', this.name)
      await this.$root.boardCreate(this.name)
      this.close()
    },
    async close () {
      this.$root.flow.addBoard = false
    }
  }
})
