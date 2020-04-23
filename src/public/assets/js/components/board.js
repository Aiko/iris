Vue.component('board', {
    props: ['boardName', 'board'],
    computed: {
        prettyBoardName() {
            return this.boardName.replace("[Aiko Mail]/", '')
        }
    },
})