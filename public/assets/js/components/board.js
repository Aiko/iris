Vue.component('board', {
  props: ['board', 'slug', 'syncing', 'seenFilter'],
  watch: {
    'board.width': async function(_) {
      const board = this.$root.resolveBoard(this.board.name)
      if (!board) return;
      const i = this.$root.boards.indexOf(board)

      this.$root.boards[i].width = this.board.width

      await Satellite.store(this.$root.imapConfig.email + ':boards', this.$root.boards)
    }
  },
  data () {
    return {
      showActions: false,
      visibleMax: 100,
      visibleMin: 0,
    }
  },
  computed: {
    //! pretty sure we don't need this anymore.
    prettyBoardName () {
      return this.board?.name.replace('[Aiko Mail]/', '')
    },
    unread () {
      return this.$root.resolveThreads(this.board?.tids || []).filter(_ => _).filter(({ seen }) => !seen).length
    },
    slug () {
      return this.board?.name
    }
  },
  methods: {
    //? handles scrolling down to fetch more
    onScroll (e) {
      /* CONFIG */
      const THREAD_HEIGHT = 114 // height including padding
      const THREAD_SPACING = 15 // margin between items
      const TOLERANCE = 5 // # of items above/below rendered additionally
      /* END CONFIG */
      const ref = "board-" + this.board.name
      if (!this.$refs[ref]?.[0]) return;
      const { scrollHeight, scrollTop, clientHeight } = this.$refs[ref][0]

      const scrollAmount = scrollTop
      const scrollViewHeight = clientHeight
      const scrollView = {
        min: scrollAmount,
        max: scrollAmount + scrollViewHeight
      }

      const itemHeight = THREAD_HEIGHT + THREAD_SPACING
      const listSize = this.board.tids.length
      const listHeight = listSize * itemHeight

      const threadsAbove = scrollView.min / itemHeight
      const threadsShown = scrollViewHeight / itemHeight
      const threadsBelow = (listHeight - scrollView.max) / itemHeight

      const indexMin = Math.floor(threadsAbove - TOLERANCE)
      const indexMax = Math.ceil((listSize - threadsBelow) + TOLERANCE)

      if (this.board.tids.length > 0) {
        const minTID = this.board.tids?.[indexMin] || this.board.tids[0]
        const maxTID = this.board.tids?.[indexMax] || this.board.tids.last()
        this.visibleMin = this.board.tids.indexOf(minTID) - TOLERANCE
        this.visibleMax = this.board.tids.indexOf(maxTID) + TOLERANCE
      }
    },
  }
})
