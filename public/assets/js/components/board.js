Vue.component('board', {
  props: ['board', 'syncing'],
  watch: {
    thin() {
      const board = this.$root.boards.filter(({ name }) => name == this.board.name)?.[0]
      if (!app) return;
      const i = this.$root.boards.indexOf(board)
      this.$root.boards[i].thin = this.thin
      if (this.thin) {
        this.$root.boardThiccness.push(board.name)
      } else {
        this.$root.boardThiccness = this.$root.boardThiccness.filter(n => n != board.name)
      }
      await SmallStorage.store(this.$root.imapConfig.email + ':board-thiccness', this.$root.boardThiccness)
    }
  },
  computed: {
    prettyBoardName () {
      return this.board.name.replace('[Aiko Mail]/', '')
    },
    unread () {
      return this.$root.resolveThreads(this.board.tids).filter(({ seen }) => !seen).length
    }
  }
})
