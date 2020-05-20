const modalmanager = {
    data: {
        addMailbox: false,
        forceAddMailbox: false,
        addBoard: false
    },
    watch: {
        forceAddMailbox(f, _) {
            this.addMailbox = f || this.addMailbox
        }
    },
    methods: {
    }
}