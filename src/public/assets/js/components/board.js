Vue.component('board', {
    props: ['boardName'],
    computed: {
        prettyBoardName() {
            return this.boardName.replace("[Aiko Mail]/", '')
        }
    }
})