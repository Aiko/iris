Vue.component('view-email', {
    props: ['email-card'],
    data() {
        return {}
    },
    methods: {
        close() {
            app.viewEmail = null
        }
    }
})