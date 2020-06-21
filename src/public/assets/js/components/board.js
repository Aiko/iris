Vue.component('board', {
  props: ['boardName', 'board', 'syncing'],
  watch: {
    thin() {
      app.boards[this.boardName].thin = this.thin
    }
  },
  computed: {
    prettyBoardName () {
      return this.boardName.replace('[Aiko Mail]/', '')
    }
  }
})
