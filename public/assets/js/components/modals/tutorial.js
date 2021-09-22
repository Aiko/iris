Vue.component('tutorial-modal', {
  data () {
    return {}
  },
  methods: {
    close () {
      this.$root.firstTime = false
      DwarfStar.settings.meta.firstTime = false
      DwarfStar.save()
    }
  }
})
