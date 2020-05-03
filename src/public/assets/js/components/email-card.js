Vue.component('email-card', {
    template: '#email-card',
    props: ['email'],
    methods: {
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
            }
        }
    }
})