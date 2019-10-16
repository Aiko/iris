const state = VueP('aiko-mail')

state.ignore('loading')
state.ignore('error')

state.ignore('password')


const app = new Vue({
    el: '#app',
    data: {
        error: null,
        /* Auth */
        email: '',
        password: '',
        token: '',
        /* Profile */
    },
    computed: {

    },
    watch: {
        loading(wasLoading, isLoading) {
            if (wasLoading && isLoading) return;
            if (!wasLoading && isLoading) {
                setTimeout(() => {
                    document.getElementById('fixed').style.display = 'none'
                }, 300)
                return
            }
            if (wasLoading && !isLoading) {
                document.getElementById('fixed').style.display = ''
                return
            }
            return
        },
    },
    methods: {

    }
})