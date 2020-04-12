Vue.component('tutorial-modal', {
    template: '#tutorial-modal',
    data() {
        return {}
    },
    methods: {
        close() {
            app.firstTime = false
        }
    }
})