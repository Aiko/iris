const modalmanager = {
    data: {
        addMailbox: false,
        forceAddMailbox: false
    },
    watch: {
        forceAddMailbox(f, _) {
            this.addMailbox = f || this.addMailbox
        }
    },
    methods: {
    }
}