Vue.component('board', {
  props: ['boardName', 'board', 'syncing'],
  data() {
    return {
      thin: false
    }
  },
  computed: {
    prettyBoardName () {
      return this.boardName.replace('[Aiko Mail]/', '')
    }
  }
})
