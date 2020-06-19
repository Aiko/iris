Vue.component('board', {
  props: ['boardName', 'board', 'syncing'],
  computed: {
    prettyBoardName () {
      return this.boardName.replace('[Aiko Mail]/', '')
    }
  }
})
