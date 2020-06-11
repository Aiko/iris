const shortcuts = {
    data: {
        focused: {
            index: -1,
            folder: "INBOX"
        },
    },
    async created() {
        const leftArrow = 37
        const upArrow = 38
        const rightArrow = 39
        const downArrow = 40

        const that = this;
        document.addEventListener('keyup', function (evt) {
            switch (evt.keyCode) {
                case leftArrow: return that.focusPrevBoard();
                case rightArrow: return that.focusNextBoard();
                case downArrow: return that.focusNextEmail();
                case upArrow: return that.focusPreviousEmail();
                default: return;
            }
        })
    },
    methods: {
        async focusNextEmail() {
            //* for the inbox, adjust for priority
            if (this.focused.folder == "INBOX") {
                if (this.inbox.emails.length > (this.focused.index + 1)) {
                    if (this.priority) {
                        //* find the next priority email
                        const nextIndex = this.inbox.emails.map((email, i) => {
                            email.index = i
                            return email
                        }).filter(e =>
                            !(e?.ai?.subscription) &&
                            !(e?.ai?.threaded) &&
                            (e.index > this.focused.index) &&
                            e.folder == "INBOX"
                        )?.[0]?.index
                        if (nextIndex) this.focused.index = nextIndex
                    } else this.focused.index += 1
                }
            }
            //* for the boards, just increment
            else if (this.boardNames.includes(this.focused.folder)) {
                if (this.boards[this.focused.folder]?.emails?.length > (this.focused.index + 1)) {
                    this.focused.index += 1;
                }
            }
            //* same goes for done
            else if (this.focused.folder == "[Aiko Mail]/Done") {
                if (this.done?.emails?.length > (this.focused.index + 1)) {
                    this.focused.index += 1;
                }
            }
        },
        async focusPreviousEmail() {
            //* for the inbox, adjust for priority
            if (this.focused.folder == "INBOX") {
                if (this.focused.index - 1 > -1) {
                    if (this.priority) {
                        //* find the previous priority email
                        const validEmails = this.inbox.emails.map((email, i) => {
                            email.index = i
                            return email
                        }).filter(e =>
                            !(e?.ai?.subscription) &&
                            !(e?.ai?.threaded) &&
                            (e.index < this.focused.index) &&
                            e.folder == "INBOX"
                        )
                        if (validEmails.length > 0) {
                            const nextIndex = validEmails.last()?.index
                            if (nextIndex) this.focused.index = nextIndex
                        }
                    } else this.focused.index -= 1
                }
            }
            //* for the boards, just decrement
            else if (this.boardNames.includes(this.focused.folder)) {
                if ((this.focused.index - 1) > -1) {
                    this.focused.index -= 1;
                }
            }
            //* same goes for done
            else if (this.focused.folder == "[Aiko Mail]/Done") {
                if ((this.focused.index + 1) > -1) {
                    this.focused.index -= 1;
                }
            }
        },
        async focusNextBoard() {
            if (this.focused.folder == "INBOX") {
                //* if we're in the inbox focus the first board if it exists
                if (this.boardNames.length > 0) {
                    this.focused.folder = this.boardNames[0]
                    this.focused.index = 0
                }
                //* else focus the done board
                else {
                    this.focused.folder = "[Aiko Mail]/Done"
                    this.focused.index = 0
                }
            }
            else if (this.boardNames.includes(this.focused.folder)) {
                //* if we're in a board focus the next board if it exists
                const i = this.boardNames.indexOf(this.focused.folder)
                if (this.boardNames.length > (i+1)) {
                    this.focused.folder = this.boardNames[i+1]
                    this.focused.index = 0
                }
                //* else focus the done board
                else {
                    this.focused.folder = "[Aiko Mail]/Done"
                    this.focused.index = 0
                }
            }
            //* if we're in the done board do nothing
        },
        async focusPrevBoard() {
            if (this.focused.folder == "[Aiko Mail]/Done") {
                //* if we're in the done folder focus the last board if it exists
                if (this.boardNames.length > 0) {
                    this.focused.folder = this.boardNames.last()
                    this.focused.index = 0
                }
                //* else focus the inbox
                else {
                    this.focused.folder = "INBOX"
                    if (this.priority) {
                        //* find the first priority email
                        const nextIndex = this.inbox.emails.map((email, i) => {
                            email.index = i
                            return email
                        }).filter(e =>
                            !(e?.ai?.subscription) &&
                            !(e?.ai?.threaded) &&
                            e.folder == "INBOX"
                        )?.[0]?.index
                        if (nextIndex) this.focused.index = nextIndex
                    } else this.focused.index = 0
                }
            }
            else if (this.boardNames.includes(this.focused.folder)) {
                //* if we're in a board focus the previous board if it exists
                const i = this.boardNames.indexOf(this.focused.folder)
                if ((i-1) > -1) {
                    this.focused.folder = this.boardNames[i-1]
                    this.focused.index = 0
                }
                //* else focus the inbox
                else {
                    this.focused.folder = "INBOX"
                    if (this.priority) {
                        //* find the first priority email
                        const nextIndex = this.inbox.emails.map((email, i) => {
                            email.index = i
                            return email
                        }).filter(e =>
                            !(e?.ai?.subscription) &&
                            !(e?.ai?.threaded) &&
                            e.folder == "INBOX"
                        )?.[0]?.index
                        if (nextIndex) this.focused.index = nextIndex
                    } else this.focused.index = 0
                }
            }
            //* if we're in the inbox, focus the first email
            else if (this.focused.folder == "INBOX") {
                if (this.priority) {
                    //* find the first priority email
                    const nextIndex = this.inbox.emails.map((email, i) => {
                        email.index = i
                        return email
                    }).filter(e =>
                        !(e?.ai?.subscription) &&
                        !(e?.ai?.threaded) &&
                        e.folder == "INBOX"
                    )?.[0]?.index
                    if (nextIndex) this.focused.index = nextIndex
                } else this.focused.index = 0
            }
        },
    }
}