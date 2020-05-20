const AICore = (() => {
    const summarize = async (text, n=3) => {
        const s = await fetch('https://api.helloaiko.com/email', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "text": text,
                "num": n
            })
        })
        const d = await s.json()
        if (d.text && d.text.length > 0) return d.text
        else return null
    }
    const choke = async sentence => {
        sentence = unescapeHTML(sentence)
        sentence = sentence.trim()
        sentence = sentence.replace(/[^A-z0-9\.!\?,;\- '"]/g, '')
        if (sentence.length < 10) return 0;
        const s = await fetch('https://bigbrain.helloaiko.com:4114/parse', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "q": sentence,
                "project": "actionable",
                "model": "v4"
            })
        }).catch(console.error)
        const d = await s.json()
        if (!d) return 0
        let conf = 0
        d.intent_ranking.map(({name, confidence}) => {
            if ([
                "meeting",
                "scheduling",
                "actionable"
            ].includes(name))
                conf += confidence
        })
        return conf
    }
    const intent = async sentence => {
        const og_sentence = sentence
        sentence = unescapeHTML(sentence)
        sentence = sentence.trim()
        sentence = sentence.replace(/[^A-z0-9\.!\?,;\ "]/g, '')
        if (sentence.length < 10) return 0;
        const s = await fetch('https://bigbrain.helloaiko.com:4114/parse', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "q": sentence,
                "project": "scheduler",
                "model": "v4"
            })
        }).catch(console.error)
        const d = await s.json()
        if (!d) return null
        const intent = {}
        if (
            (d.intent.name == 'scheduling' || d.intent.name == 'meeting')
            && d.intent.confidence > 0.5
        ) {
            intent.type = 'Event'
            intent.confidence = d.intent.confidence
            intent.context = og_sentence
            const subjects = d.entities.filter(_ => _.entity == 'subject')
            if (subjects.length > 0) {
                intent.subject = subjects[0]
                if (intent.subject.value.trim().length < 3)
                    intent.subject = null
            }
            const times = d.entities.filter(_ => _.entity == 'time')
            if (times.length > 0) {
                const time = times[0]
                if (time.value.trim().length < 2) {
                    const possible_times = chrono.parse(sentence)
                    if (possible_times.length > 0) {
                        const knowledge = {}
                        possible_times.map(time => {
                            if (time.end) intent.endTime = time.end.date()
                            const keys = Object.keys(time.start.knownValues)
                            keys.map(key => knowledge[key] = time.start.knownValues[key])
                        })
                        if (knowledge.month) knowledge.month = knowledge.month - 1
                        if (!knowledge.day) knowledge.day = possible_times[0].start.impliedValues.day
                        if (!knowledge.month) knowledge.month = possible_times[0].start.impliedValues.month - 1
                        if (!knowledge.hour) knowledge.hour = possible_times[0].start.impliedValues.hour
                        if (!knowledge.minute) knowledge.minute = 0
                        if (!knowledge.year) knowledge.year = possible_times[0].start.impliesValues.year
                        const d = new Date(knowledge.year, knowledge.month, knowledge.day, knowledge.hour, knowledge.minute || 0)
                        intent.time = d
                        intent.friendlyTime = d.toLocaleTimeString('en-us', {
                            hour: 'numeric',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'numeric'
                        })
                    }
                }
            }
            return intent
        }
        return null
    }

    return {
        summarize,
        choke,
        intent
    }
})()