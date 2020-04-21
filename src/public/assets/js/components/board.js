Vue.component('board', {
    props: ['boardName', 'board'],
    computed: {
        prettyBoardName() {
            return this.boardName.replace("[Aiko Mail]/", '')
        }
    },
    methods: {
        async debug() {
            console.log(this.board)
            console.log(this.boardName)
        }
    }
})