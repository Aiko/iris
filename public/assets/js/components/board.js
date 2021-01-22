Vue.component('board', {
  props: ['board', 'syncing'],
  watch: {
    thin() {
      const board = app.boards.filter(({ name }) => name == this.board.name)?.[0]
      if (!app) return;
      const i = app.boards.indexOf(board)
      app.boards[i].thin = this.thin
      if (this.thin) {
        app.boardThiccness.push(board.name)
      } else {
        app.boardThiccness = app.boardThiccness.filter(n => n != board.name)
      }
      await SmallStorage.store(app.imapConfig.email + ':board-thiccness', app.boardThiccness)
    }
  },
  computed: {
    prettyBoardName () {
      return this.board.name.replace('[Aiko Mail]/', '')
    },
    unread () {
      return app.resolveThreads(this.board.tids).filter(({ seen }) => !seen).length
    }
  }
})
