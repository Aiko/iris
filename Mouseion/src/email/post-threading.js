module.exports = () => (cache, configs) => {
  let q = []

  const cleanup = async () => {
    const cursor = configs.load('cursor')
    const merged = new Set()
    for (const thread_id of q) {
      if (merged.has(thread_id)) continue;
      const thread = await cache.lookup.tid(thread_id)
      if (!thread) continue;

      const thread_date = new Date(thread.date)
      const thread_messages = (await Promise.all(thread.mids.map(cache.lookup.mid))).sort((a, b) => b.timestamp - a.timestamp)
      if (thread_messages.length == 0) continue;
      const thread_subject = thread_messages[0].subject

      const same_subject_threads = new Set()
      const same_subject_messages = await cache.lookup.withSubject(thread_subject)

      const WEEK = (() => {
        const MS2S = 1000
        const S2MIN = 60
        const MIN2HOUR = 60
        const HOUR2DAY = 24
        const DAY2WEEK = 7
        return MS2S * S2MIN * MIN2HOUR * HOUR2DAY * DAY2WEEK
      })()

      same_subject_messages.map(({ timestamp, tid }) => {
        //? ignore ourselves
        if (tid == thread_id) return;
        //? ignore merged threads
        if (merged.has(tid)) return;
        //? anything newer is ignored
        const date = new Date(timestamp)
        if (date > thread_date) return;
        //? if it's too old we also ignore
        if (Math.abs(date - thread_date) > 16*WEEK) return;
        //? otherwise add the tid
        same_subject_threads.add(tid)
        merged.add(tid)
      })

      //? merge all the same subject threads into thread_id
      for (const tid of same_subject_threads) {
        const mids = await cache.merge.thread(tid, thread_id, cursor)
        const thr1 = await cache.lookup.tid(tid)
        const thr2 = await cache.lookup.tid(thread_id)
        if (thread_subject == "reschedule meeting") {
          console.log("Subject-threading", thread_subject)
          console.log("Merging", tid, "into", thread_id, "got", mids)
          if (thr1?.mids) console.log("Thread 1 messages:", thr1?.mids?.length)
          else console.log("Thread 1 is now:", thr1)
          console.log("Thread 2 messages:", thr2.mids.length)
        }
      }
    }
    q = []
  }

  return {
    cleanup,
    queue: (...args) => {
      q.push(...args)
    }
  }
}