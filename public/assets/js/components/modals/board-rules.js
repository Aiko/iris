Vue.component('board-rules', {
  data() {
    return {
    }
  },
  methods: {
    async close() {
      this.$root.flow.showBoardRules = false
    }
  }
})