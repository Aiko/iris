Vue.component('tutorial-modal', {
  data () {
    return {}
  },
  methods: {
    close () {
      this.$root.firstTime = false
      DwarfStar.save({meta: {firstTime: false}})
    }
  }
})
