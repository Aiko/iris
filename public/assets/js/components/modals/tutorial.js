Vue.component('tutorial-modal', {
  data () {
    return {}
  },
  methods: {
    close () {
      this.$root.firstTime = false
      DwarfStar.settings.firstTime = false
      DwarfStar.save()
    }
  }
})
