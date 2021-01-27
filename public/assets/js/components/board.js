Vue.component('board', {
  props: ['board', 'slug', 'syncing', 'seenFilter'],
  watch: {
    async thin() {
      const board = this.$root.resolveBoard(this.board.name)
      if (!board) return;
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
    //! pretty sure we don't need this anymore.
    prettyBoardName () {
      return this.board.name.replace('[Aiko Mail]/', '')
    },
    unread () {
      console.log(this.board.tids)
      return this.$root.resolveThreads(this.board.tids).filter(({ seen }) => !seen).length
    },
    slug () {
      return this.board.name
    }
  }
})
