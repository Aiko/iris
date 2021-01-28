const Janitor = require('../cleaner')

const threading = async (email, provider,
  Folders,
  cursor,
  cache, courier,
  Contacts, BoardRules, AfterThread,
  Cleaners, Log, Lumberjack, actually_thread=true) => {

  if (!email.M.references) {
    Log.error("Cannot call threading on an uncleaned email. Requires header-level parsing.")
    return null
  }

  //? if the email exists locally skip threading
  const exists = await cache.lookup.mid(email.M.envelope.mid)

  if (exists) {
    await cache.add.message(email.M.envelope.mid, email.folder, email.uid, email.M.envelope.cleanSubject, cursor, {
      timestamp: email.M.envelope.date
    })
    return exists.tid
  }

  //? thread_reference and thread_subject should set thread_id
  //? to the tid of the current email if they match and cache the email
  let thread_id = null

  //? thread a single reference
  const thread_reference = async reference => {
    //* check if we have the reference already,
    const exists = await cache.lookup.mid(reference)
    if (exists) {
      //* if we already have the reference, we work with existing threads
      const { mid, tid, } = exists
      if (thread_id) {
        //* if they are in the same thread, ignore
        if (thread_id == tid) return true
        //* if the email has already been threaded into something, we have to do a thread merge
        await cache.merge(tid, thread_id, cursor) //? merges the old thread into the new one
        return true
      } else {
        //* otherwise, just append it to the existing thread
        await cache.add.message(email.M.envelope.mid, email.folder, email.uid, email.M.envelope.cleanSubject, cursor, {
          seen: email.M.flags.seen,
          starred: email.M.flags.starred,
          tid,
          timestamp: email.M.envelope.date
        })
        thread_id = tid
        return true
      }
    } else {
        //* if we don't have the reference, pull it from remote and thread it first
        const look_for_reference = async folder => {
          if (!Cleaners[folder]) Cleaners[folder] = await Janitor(Lumberjack, folder)
          const Cleaner = Cleaners[folder]
          //* find all matching references
          const matches = await courier.messages.searchMessages(folder, {
            header: [ 'Message-ID', reference ]
          })
          let found = false
          //* thread each of those
          if (matches.length > 0) {
            for (const uid in matches) {
              if (uid == email.M.envelope.uid) continue
              if (uid == 0) continue
              const remote_ref = (await Promise.all(courier.messages.listMessages(folder, uid, {
                peek: true, markAsSeen: false, onlyflags: false,
                always_fetch_headers: true, parse: true,
              }).map(Cleaner.headers)))?.[0]
              if (remote_ref) {
                //? I believe we can just thread the remote ref directly
                //? might run into issues if not date sorted
                await threading(remote_ref, Folders,
                  cursor,
                  cache, courier,
                  Contacts, BoardRules, AfterThread,
                  Cleaners, Log)
                found = true
              }
            }
          }
          return found
        }

        let found = false
        if (Folders.get().archive) found = await look_for_reference(Folders.get().archive)

        //* if the provider isn't google and we haven't found it,
        //* we need to keep searching
        if (provider != 'google' && !found) {
          found = await look_for_reference(Folders.get().sent)
          if (!found) found = await look_for_reference(Folders.get().inbox)
          if (!found) found = await look_for_reference(Folders.get().trash)
        }

        //* if we have found it, call ourselves again (don't make assumptions)
        if (found) return await thread_reference(reference)
        else return false //* otherwise we failed
    }
    return false //! should be unreachable
  }

  //? thread by subject
  const thread_subject = async folder => {
    if (!folder) return (Log.error(folder, "does not exist") && false)
    if (!Cleaners[folder]) Cleaners[folder] = await Janitor(Lumberjack, folder)
    const Cleaner = Cleaners[folder]

    //* find all matching previous messages both the clean and unclean subject
    const cleanMatches = await courier.messages.searchMessages(folder, {
      header: [ 'subject', email.M.envelope.cleanSubject ]
    })
    const fullMatches = await courier.messages.searchMessages(folder, {
      header: [ 'subject', email.M.envelope.subject ]
    })
    const matches = [...cleanMatches]
    fullMatches.map(match => {if (!matches.includes(match)) matches.push(match) })

    let found = false
    //* thread each of the previous messages
    const helper = async uid => {
      //* find the previous message locally
      const exists = await cache.lookup.uid(folder, uid)
      if (exists) {
        //* if it exists, we're going to thread it in
        const { mid, tid } = exists

        const local_with_headers = await cache.L1.check(mid)
        const cleaned_local_with_headers = await Cleaner.storage(local_with_headers)
        //* check date precedence, if it's too new we should discard
        if (cleaned_local_with_headers.M.envelope.date >= email.M.envelope.date) return;
        //* check to make sure emails are within contiguous time leap (4 months)
        const WEEK = (() => {
          const MS2S = 1000
          const S2MIN = 60
          const MIN2HOUR = 60
          const HOUR2DAY = 24
          const DAY2WEEK = 7
          return MS2S * S2MIN * MIN2HOUR * HOUR2DAY * DAY2WEEK
        })()
        //* if it's too old we should also discard
        if (Math.abs(cleaned_local_with_headers.M.envelope.date - email.M.envelope.date) > 16*WEEK) return;

        //* if we already have a thread going, we're going to bring the old into the new
        if (thread_id) {
          if (thread_id == tid) return true;
          //* possibly add a new location for the previous message
          await cache.add.message(mid, folder, uid, )
          //* bring the thread of the previous msg into our current thread
          await cache.merge(tid, thread_id) //? merges the old thread into the new one
          found = true
        } else {
          //* otherwise, just append our new email to the previous message's thread
          await cache.add.message(email.M.envelope.mid, email.folder, email.uid, {
            seen: email.M.flags.seen,
            starred: email.M.flags.starred,
            tid,
          })
          thread_id = tid
          found = true
        }
      }
      else {
        //* pull it in from remote ref
        const remote_ref = (await Promise.all(
          (
            await courier.messages.listMessages(folder, uid, {
              peek: true, markAsSeen: false, onlyflags: false,
              always_fetch_headers: true, parse: true,
            })
          ).map(Cleaner.headers)
        ))?.[0]
        if (remote_ref) {
          //* check to make sure email precedes current
          if (remote_ref.M.envelope.date >= email.M.envelope.date) return;
          //* check to make sure emails are within contiguous time leap (4 months)
          const WEEK = (() => {
            const MS2S = 1000
            const S2MIN = 60
            const MIN2HOUR = 60
            const HOUR2DAY = 24
            const DAY2WEEK = 7
            return MS2S * S2MIN * MIN2HOUR * HOUR2DAY * DAY2WEEK
          })()
          if (Math.abs(remote_ref.M.envelope.date - email.M.envelope.date) > 16*WEEK) return;

          //? I believe we can just thread the remote ref directly
          //? might run into issues if not date sorted
          await threading(remote_ref, Folders,
            cache, courier,
            Contacts, BoardRules, AfterThread,
            Cleaners, Log)
          return helper(uid) //* call itself again so it goes through the exists pipeline
        }
      }
    }
    if (matches.length > 0) {
      //* we do this linearly on purpose
      //? perhaps in the future pulling remote refs can be done first all at once
      //? that would improve speed (although unsure if this method has speed issues to begin with)
      for (const uid of matches) {
        if (uid == email.M.envelope.uid) continue;
        if (uid != 0) await helper('' + uid)
        else Log.error(matches)
      }
    }
    return found
  }

  //? we go in reverse to preserve oldest-first
  if (email.M.references.length > 0 && actually_thread) {
    email.M.references.slice().reverse().map(thread_reference)
  }

  //! TODO: fix subject threading
  /*
  if (!thread_id && email.M.references.length > 0) {
    Log.warn("Was not able to thread references, using subject-grouping.")
    //? otherwise thread by subject
    if (Folders.archive) await thread_subject(Folders.archive)
    if (provider != 'google') {
      await thread_subject(Folders.sent)
      await thread_subject(Folders.inbox)
      await thread_subject(Folders.trash)
    }
  }
  */

  //? if we don't have a thread id it's time to commit email to cache by itself
  if (!thread_id) {
    await cache.add.message(email.M.envelope.mid, email.folder, email.uid, email.M.envelope.cleanSubject, cursor, {
      seen: email.M.flags.seen,
      starred: email.M.flags.starred,
      timestamp: email.M.envelope.date,
      //* we omit tid because the caching mechanism will create one by itself :)
    })
    const { tid } = await cache.lookup.mid(email.M.envelope.mid)
    thread_id = tid
  } else {
    //* otherwise, just possibly add new location
    await cache.add.message(email.M.envelope.mid, email.folder, email.uid, email.M.envelope.cleanSubject, cursor, {
      timestamp: email.M.envelope.date
    })
  }

  if (AfterThread) AfterThread.queue(thread_id)

  if (Contacts) Contacts.queue(email)
  if (email.folder == Folders.get().inbox || Object.values(Folders.get().aiko).includes(email.folder)) {
    if (BoardRules && email.parsed) { // only queue parsed emails for board rules
      BoardRules.queue(email)
    }
  }

  //? this system works best when older messages are added first
  return thread_id
}

module.exports = threading