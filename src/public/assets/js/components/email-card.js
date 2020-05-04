Vue.component('email-card', {
    template: '#email-card',
    props: ['email', 'board', 'inbox', 'index'],
    methods: {
        async debug() {
            console.log(this.email)
            console.log(this.email.ai.thread)
            console.log(this.email.ai.threaded)
        },
        async deleteMessage() {
            if (!this.email.syncing) {
                this.email.ai.deleted = true
                await app.callIPC(
                    app.task_DeleteEmails(
                        this.email.folder,
                        this.email.uid
                    )
                )
                if (this.email.inboxUID) await app.callIPC(
                    app.task_DeleteEmails(
                        "INBOX",
                        this.email.inboxUID
                    )
                )
                this.saveToCache()
            }
        },
        async saveToCache() {
            if (this.email.folder == "INBOX") {
                await BigStorage.store(app.imapConfig.email + '/inbox', {
                    uidLatest: app.inbox.uidLatest,
                    //modSeq: this.inbox.modSeq,
                    emails: app.inbox.emails.slice(0,50)
                })
            } else {
                await BigStorage.store(app.imapConfig.email + '/boards', app.boards)
            }

            if (this.inbox) {
                Vue.set(app.inbox.emails, this.index, this.email)
            } else {
                Vue.set(app.boards[this.board].emails, this.index, this.email)
            }
        },
        async starMessage() {
            if (!this.email.syncing) {
                // update view model asap
                this.email.ai.starred = true
                // if it's already flagged but not starred idk?
                // its a bug but fuck it, can ignore
                if (this.email.flags.includes('\\Flagged')) return;
                this.email.flags.push('\\Flagged')
                await app.callIPC(
                    app.task_SetFlags(
                        this.email.folder,
                        this.email.uid,
                        {
                            set: this.email.flags
                        }
                    )
                )
                if (this.email.inboxUID) await app.callIPC(
                    app.task_SetFlags(
                        "INBOX",
                        this.email.inboxUID,
                        {
                            set: this.email.flags
                        }
                    )
                )

                // update view model
                this.saveToCache()
            }
        },
        async unstarMessage() {
            if (!this.email.syncing) {
                // update view model asap
                this.email.ai.starred = false
                // if it's already unflagged but not unstarred idk?
                // its a bug but fuck it, can ignore
                if (!(this.email.flags.includes('\\Flagged'))) return;
                this.email.flags = this.email.flags.filter(flag =>
                    flag != '\\Flagged'
                )
                await app.callIPC(
                    app.task_SetFlags(
                        this.email.folder,
                        this.email.uid,
                        {
                            set: this.email.flags
                        }
                    )
                )
                if (this.email.inboxUID) await app.callIPC(
                    app.task_SetFlags(
                        "INBOX",
                        this.email.inboxUID,
                        {
                            set: this.email.flags
                        }
                    )
                )
                this.saveToCache()
            }
        }
    }
})