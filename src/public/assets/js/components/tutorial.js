Vue.component('tutorial-modal', {
    template: '#tutorial-modal',
    data() {
        return {}
    },
    methods: {
        close() {
            alert("HELLO HELLO HELLO!!!!")
            app.firstTime = false
        }
    }
})