Vue.component('view-email', {
    props: ['emailcard'],
    data() {
        return {
            email: this.emailcard,
            thread: [],
        }
    },
    async created() {
        //* first fetch the selected email
        console.time("Fetching selected email.")
        const s = await app.executeIPC(app.task_FetchEmails(this.email.folder, this.email.uid, false, null, null, null, true))
        console.timeEnd("Fetching selected email.")
        if (!s?.[0]) return window.error("Couldn't fetch selected email.");
        this.email.parsed.text = s[0]?.parsed?.text
        this.email.parsed.html = s[0]?.parsed?.html
        // this.email.parsed.attachments = s[0]?.parsed?.attachments || this.email.parsed?.attachments
        //* then fetch the thread
        if (this.email.parsed.thread?.messages?.length > 0) {
            const to_fetch = {}
            for (const threaded_email of this.email.parsed.thread.messages) {
                if (!to_fetch[threaded_email.folder]) to_fetch[threaded_email.folder] = []
                to_fetch[threaded_email.folder].push(eval(threaded_email.uid))
            }
            const emails = []
            for (const folder in to_fetch) {
                console.time("Fetching emails from " + folder)
                const uids = to_fetch[folder].sort()
                const ranges = []
                for (let i = 0; i < uids.length;) {
                    const min = uids[i];
                    i++;
                    if (i < uids.length && (uids[i] == (uids[i-1] + 1))) {
                        while (i < uids.length && (uids[i] == (uids[i-1] + 1))) i++;
                        const max = uids[i-1];
                        ranges.push(min + ':' + max)
                    }
                    else ranges.push(min)
                }
                const sequence = ranges.join(',')
                const fetched = await app.executeIPC(app.task_FetchEmails(
                    folder, sequence, false, null, null, null, true
                ))
                console.timeEnd("Fetching emails from " + folder)
                if (!fetched) {
                    window.error("Couldn't fetch threaded email. Skipping!")
                } else {
                    console.time("Cleaning emails from " + folder)
                    const cleaned = await MailCleaner.base(folder, fetched)
                    emails.push(...cleaned)
                    console.timeEnd("Cleaning emails from " + folder)
                }
            }
            this.email.parsed.thread.messages = this.email.parsed.thread.messages.map(e => {
                const matches = emails.filter(e2 => e2.folder == e.folder && e2.uid == e.uid)
                if (matches.length > 0) e.parsed = matches[0].parsed
                else window.error("Message in thread doesn't have a match:", e)
                return e
            })
        }
        info("Here is your view email:", this.email)
    },
    methods: {
        close() {
            app.viewEmail = null
        }
    }
})