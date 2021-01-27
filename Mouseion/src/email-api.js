const Sequence = require('./email/sequence')
const batchMap = require('../utils/do-in-batch')

module.exports = (cache, courier, Folders, Cleaners, Link, AI_BATCH_SIZE) => {
  //! every time the app pulls from backend it pulls any thread with higher modseq (fresh open, app.modseq = 0)

  // TODO: need to add `emails` to resolve
  //? that would have resolvers that work on a list of messages
  //? im only skipping it because i dont see a use for it now
  //? but you could easily refactor `resolve.thread` for that

  //? resolvers to get the actual message data associated with db models
  const resolve = {
    email: {
      full: async ({ mid, locations, seen, starred }) => {
        // TODO: attachment caching
        //? check if we have it
        let email = await cache.L3.check(mid)
        //? if we don't fetch it and cache it
        if (!email) {
          const { folder, uid } = locations.filter(_ => _)?.[0]
          if (!Cleaners[folder]) {
            Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
              folder == Folders.get().inbox || folder.startsWith("[Aiko]")
            ))
          }
          const Cleaner = Cleaners[folder]
          email = await courier.messages.listMessages(
            folder, uid, {
              peek: false,
              markAsSeen: false,
              always_fetch_headers: true,
              limit: 1, downloadAttachments: true
            }
          )
          email = email?.[0]
          if (!email) return null;
          email = await Cleaner.full(email)
          await cache.L3.cache(mid, email)
          email = JSON.parse(JSON.stringify(email))
          email.parsed.html = null
          email.parsed.text = null
          await cache.L2.cache(mid, email)
          await cache.L1.cache(mid, email)
        }

        email.M.flags.seen = seen
        email.M.flags.starred = starred
        email.locations = locations

        //? return it
        return email
      },
      partial: async ({ mid, locations, seen, starred }) => {
        //? check if we have it
        let email = await cache.L2.check(mid)
        //? if we don't fetch it and cache it
        if (!email) {
          const { folder, uid } = locations.filter(_ => _)?.[0]
          if (!Cleaners[folder]) {
            Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
              folder == Folders.get().inbox || folder.startsWith("[Aiko]")
            ))
          }
          const Cleaner = Cleaners[folder]
          email = await courier.messages.listMessages(
            folder, uid, {
              peek: false, markAsSeen: false,
              always_fetch_headers: true,
              limit: 1
            }
          )
          email = email?.[0]
          if (!email) return null;
          email = await Cleaner.full(email)
          //? commented out because we don't fetch attachments
          // cache.L3.cache(mid, email)
          email = JSON.parse(JSON.stringify(email))
          email.parsed.html = null
          email.parsed.text = null
          await cache.L2.cache(mid, email)
          await cache.L1.cache(mid, email)
        }

        email.M.flags.seen = seen
        email.M.flags.starred = starred
        email.locations = locations

        //? return it
        return email
      },
      headers: async ({ mid, locations, seen, starred }) => {
        //? check if we have it
        let email = await cache.L1.check(mid)
        //? if we don't fetch it and cache it
        if (!email) {
          const { folder, uid } = locations.filter(_ => _)?.[0]
          if (!Cleaners[folder]) {
            Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
              folder == Folders.get().inbox || folder.startsWith("[Aiko]")
            ))
          }
          const Cleaner = Cleaners[folder]

          email = await courier.messages.listMessages(
            folder, uid, {
              peek: true,
              markAsSeen: false,
              limit: 1,
              parse: true,
              downloadAttachments: false,
              keepCidLinks: true,
              always_fetch_headers: true
            }
          )
          email = email?.[0]
          if (!email) return null;
          email = Cleaner.headers(email)
          await cache.L1.store(mid, email)
        }

        email.M.flags.seen = seen
        email.M.flags.starred = starred
        email.locations = locations

        //? return it
        return email
      }
    },
    thread: {
      // TODO: headers is skipped for now
      partial: async ({ mids, aikoFolder }) => {
        const messages = await Promise.all(mids.map(cache.lookup.mid))
        const to_fetch = []
        const fetched = []
        await Promise.all(messages.map(async message => {
          const { mid, locations, seen, starred } = message
          email = await cache.L2.check(mid)
          if (!email) return to_fetch.push(message)
          email.M.flags.seen = seen
          email.M.flags.starred = starred
          email.locations = locations
          fetched.push(email)
        }))
        const fetch_plan = {}
        fetch_plan[aikoFolder] = []
        //? build the fetch plan
        to_fetch.map(message => {
          const { locations } = message
          //? first try fetching it from aiko folder
          const afLoc = locations.filter(({ folder }) => folder == aikoFolder)?.[0]
          if (afLoc) return fetch_plan[aikoFolder].push({ uid: afLoc.uid, locations })
          //? next look for an existing folder to optimize our fetch
          const shortcut = locations.filter(({ folder }) => !!(fetch_plan[folder]))?.[0]
          if (shortcut) return fetch_plan[shortcut.folder].push({ uids: shortcut.uid, locations })
          //? next look for inbox
          const inboxLoc = locations.filter(({ folder }) => folder == "INBOX")?.[0]
          if (inboxLoc) {
            if (!(fetch_plan["INBOX"])) fetch_plan["INBOX"] = []
            return fetch_plan["INBOX"].push({ uid: inboxLoc.uid, locations })
          }
          //? next look for sent
          const sentLoc = locations.filter(({ folder }) => folder == Folders.get().sent)?.[0]
          if (sentLoc) {
            if (!(fetch_plan[Folders.get().sent])) fetch_plan[Folders.get().sent] = []
            return fetch_plan[Folders.get().sent].push({ uid: sentLoc.uid, locations })
          }
          //? if all else fails just add random folder
          const loc = locations?.[0]
          if (loc) {
            const { folder, uid } = loc
            if (!(fetch_plan[folder])) fetch_plan[folder] = []
            return fetch_plan[folder].push({ uid, locations })
          }
        })
        //? perform fetch
        await Promise.all(Object.keys(fetch_plan).map(async folder => {
          const metadata = {}
          const uids = fetch_plan[folder].map(meta => {
            const { uid } = meta
            metadata[uid] = meta
            return uid
          })
          if (uids.length == 0) return;
          if (!Cleaners[folder]) {
            Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
              folder == Folders.get().inbox || folder.startsWith("[Aiko]")
            ))
          }
          const Cleaner = Cleaners[folder]

          const emails = await courier.messages.listMessages(
            folder, Sequence(uids), {
              peek: false,
              markAsSeen: false,
              limit: uids.length,
              parse: true,
              downloadAttachments: false, //* feel free to negate this and cache it later
              keepCidLinks: true //* feel free to negate this and cache it later
            }
          )

          const cleaned_emails = await batchMap(emails, AI_BATCH_SIZE, Cleaner.full)
          await Promise.all(cleaned_emails.map(async email => {
            const meta = metadata[email.M.envelope.uid]
            if (!meta) return; //! something went super wrong
            const { locations } = meta
            email.locations = locations
            //? put the fetched email into our fetched results array
            fetched.push(email)
            email = JSON.parse(JSON.stringify(email))
            //* cache the whole thing in L3
            // this is commented out because we currently dont download attachments or resolve CID links at fetch time
            // await cache.L3.cache(email.M.envelope.mid, email)
            //* strip parsed components and cache in L2
            email.parsed.html = null
            email.parsed.text = null
            await cache.L2.cache(email.M.envelope.mid, email)
            //* drop as-is into L1 (doesn't affect us that there is MORE info)
            await cache.L1.cache(email.M.envelope.mid, email)
          }))
        }))

        return fetched.sort((a, b) => b.envelope.date - a.envelope.date)
      },
      full: async ({ mids, aikoFolder }) => {
        const messages = await Promise.all(mids.map(cache.lookup.mid))
        const to_fetch = []
        const fetched = []
        await Promise.all(messages.map(async message => {
          const { mid, locations, seen, starred } = message
          email = await cache.L3.check(mid)
          if (!email) return to_fetch.push(message)
          email.M.flags.seen = seen
          email.M.flags.starred = starred
          email.locations = locations
          fetched.push(email)
        }))
        const fetch_plan = {}
        fetch_plan[aikoFolder] = []
        //? build the fetch plan
        to_fetch.map(message => {
          const { locations } = message
          //? first try fetching it from aiko folder
          const afLoc = locations.filter(({ folder }) => folder == aikoFolder)?.[0]
          if (afLoc) return fetch_plan[aikoFolder].push({ uid: afLoc.uid, locations })
          //? next look for an existing folder to optimize our fetch
          const shortcut = locations.filter(({ folder }) => !!(fetch_plan[folder]))?.[0]
          if (shortcut) return fetch_plan[shortcut.folder].push({ uids: shortcut.uid, locations })
          //? next look for inbox
          const inboxLoc = locations.filter(({ folder }) => folder == "INBOX")?.[0]
          if (inboxLoc) {
            if (!(fetch_plan["INBOX"])) fetch_plan["INBOX"] = []
            return fetch_plan["INBOX"].push({ uid: inboxLoc.uid, locations })
          }
          //? next look for sent
          const sentLoc = locations.filter(({ folder }) => folder == Folders.get().sent)?.[0]
          if (sentLoc) {
            if (!(fetch_plan[Folders.get().sent])) fetch_plan[Folders.get().sent] = []
            return fetch_plan[Folders.get().sent].push({ uid: sentLoc.uid, locations })
          }
          //? if all else fails just add random folder
          const loc = locations?.[0]
          if (loc) {
            const { folder, uid } = loc
            if (!(fetch_plan[folder])) fetch_plan[folder] = []
            return fetch_plan[folder].push({ uid, locations })
          }
        })
        //? perform fetch
        await Promise.all(Object.keys(fetch_plan).map(async folder => {
          const metadata = {}
          const uids = fetch_plan[folder].map(meta => {
            const { uid } = meta
            metadata[uid] = meta
            return uid
          })
          if (uids.length == 0) return;
          if (!Cleaners[folder]) {
            Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
              folder == Folders.get().inbox || folder.startsWith("[Aiko]")
            ))
          }
          const Cleaner = Cleaners[folder]

          const emails = await courier.messages.listMessages(
            folder, Sequence(uids), {
              peek: false,
              markAsSeen: false,
              limit: uids.length,
              parse: true,
              downloadAttachments: true,
              keepCidLinks: false
            }
          )

          const cleaned_emails = await batchMap(emails, AI_BATCH_SIZE, Cleaner.full)
          await Promise.all(cleaned_emails.map(async email => {
            const meta = metadata[email.M.envelope.uid]
            if (!meta) return; //! something went super wrong
            const { locations } = meta
            email.locations = locations
            //? put the fetched email into our fetched results array
            fetched.push(email)
            email = JSON.parse(JSON.stringify(email))
            //* cache the whole thing in L3
            await cache.L3.cache(email.M.envelope.mid, email)
            //* strip parsed components and cache in L2
            email.parsed.html = null
            email.parsed.text = null
            await cache.L2.cache(email.M.envelope.mid, email)
            //* drop as-is into L1 (doesn't affect us that there is MORE info)
            await cache.L1.cache(email.M.envelope.mid, email)
          }))
        }))

        return fetched.sort((a, b) => b.envelope.date - a.envelope.date)
      },
    },
    threads: {
      // TODO: full, headers are skipped for now
      partial: async threads => {
        const to_fetch = {}
        const fetched = {}
        const fetch_plan = {}
        let have = 0
        let need = 0
        let found = 0
        //? first assemble what we know
        await Promise.all(threads.map(async ({ mids, aikoFolder, tid }) => {
          to_fetch[tid] = []
          fetched[tid] = []
          fetch_plan[aikoFolder] = []
          const messages = await Promise.all(mids.map(cache.lookup.mid))
          await Promise.all(messages.map(async message => {
            const { mid, locations, seen, starred } = message
            const email = await cache.L2.check(mid)
            if (!email) {
              need++;
              return to_fetch[tid].push(message)
            }
            email.M.flags.seen = seen
            email.M.flags.starred = starred
            email.locations = locations
            fetched[tid].push(email)
            have++;
          }))
        }))

        console.log("Have", have, "but need", need)

        //? build the fetch plan
        Object.keys(to_fetch).map(tid => {
          //? tid -> thread
          const thread = threads.filter(t => t.tid == tid)?.[0]
          if (!thread) return console.error("We don't have a thread with this TID"); //! something clearly went wrong
          const { aikoFolder } = thread
          //? process the thread into the fetch plan
          to_fetch[tid].map(message => {
            const { locations } = message
            //? first try fetching it from aiko folder
            const afLoc = locations.filter(({ folder }) => folder == aikoFolder)?.[0]
            if (afLoc) {
              if (!fetch_plan[aikoFolder]) {
                console.log(aikoFolder, "fetch plan newly created.")
                fetch_plan[aikoFolder] = []
              }
              return fetch_plan[aikoFolder].push({ uid: afLoc.uid, tid, locations })
            }
            //? next look for an existing folder to optimize our fetch
            const shortcut = locations.filter(({ folder }) => !!(fetch_plan[folder]))?.[0]
            if (shortcut) {
              if (!fetch_plan[shortcut.folder]) {
                console.log(shortcut.folder, "fetch plan newly created")
                fetch_plan[shortcut.folder] = []
              }
              return fetch_plan[shortcut.folder].push({ uid: shortcut.uid, tid, locations })
            }
            //? next look for inbox
            const inboxLoc = locations.filter(({ folder }) => folder == "INBOX")?.[0]
            if (inboxLoc) {
              if (!(fetch_plan["INBOX"])) {
                console.log("INBOX fetch plan newly created.")
                fetch_plan["INBOX"] = []
              }
              console.log("Adding", inboxLoc.uid, "to fetch plan for INBOX")
              return fetch_plan["INBOX"].push({ uid: inboxLoc.uid, tid, locations })
            }
            //? next look for sent
            const sentLoc = locations.filter(({ folder }) => folder == Folders.get().sent)?.[0]
            if (sentLoc) {
              if (!(fetch_plan[Folders.get().sent])) {
                console.log(Folders.get().sent, "fetch plan newly created.")
                fetch_plan[Folders.get().sent] = []
              }
              return fetch_plan[Folders.get().sent].push({ uid: sentLoc.uid, tid, locations })
            }
            //? if all else fails just add random folder
            const loc = locations?.[0]
            if (loc) {
              const { folder, uid } = loc
              if (!(fetch_plan[folder])) {
                console.log(folder, "fetch plan newly created.")
                fetch_plan[folder] = []
              }
              return fetch_plan[folder].push({ uid, tid, locations })
            }
            else console.error("Message has no locations?")
          })
        })

        //? perform fetch && put into fetched
        await Promise.all(Object.keys(fetch_plan).map(async folder => {
          const metadata = {}
          const uids = fetch_plan[folder].map(meta => {
            const { uid } = meta
            metadata[uid] = meta
            return uid
          })
          if (uids.length == 0) return;
          console.log("Fetching", uids.length, "for", folder, "using", Sequence(uids))

          if (!Cleaners[folder]) {
            Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
              folder == Folders.get().inbox || folder.startsWith("[Aiko]")
            ))
          }
          const Cleaner = Cleaners[folder]

          const emails = await courier.messages.listMessages(
            folder, Sequence(uids), {
              peek: false,
              markAsSeen: false,
              limit: uids.length,
              parse: true,
              downloadAttachments: false, //* feel free to negate this and cache it later
              keepCidLinks: true //* feel free to negate this and cache it later
            }
          )

          const cleaned_emails = await batchMap(emails, AI_BATCH_SIZE, Cleaner.full)
          await Promise.all(cleaned_emails.map(async email => {
            const meta = metadata[email.M.envelope.uid]
            if (!meta) return console.error("We don't have metadata for this uid"); //! something went super wrong
            const { tid, locations } = meta
            email.locations = locations
            //? put the fetched email into our fetched results array
            found++
            fetched[tid].push(email)
            email = JSON.parse(JSON.stringify(email))
            //* cache the whole thing in L3
            // this is commented out because we currently dont download attachments or resolve CID links at fetch time
            // await cache.L3.cache(email.M.envelope.mid, email)
            //* strip parsed components and cache in L2
            email.parsed.html = null
            email.parsed.text = null
            await cache.L2.cache(email.M.envelope.mid, email)
            //* drop as-is into L1 (doesn't affect us that there is MORE info)
            await cache.L1.cache(email.M.envelope.mid, email)
          }))
        }))

        console.log("Found", found)

        //? finally, populate threads with fetched
        return Object.keys(fetched).map(tid => {
          const emails = fetched[tid]
          const thread = threads.filter(t => t.tid == tid)?.[0]
          if (!thread) return null
          thread.emails = emails.sort((a, b) => b.envelope.date - a.envelope.date)
          return thread
        }).sort((a, b) => (new Date(a.date)) - (new Date(b.date)))
      }
    }
  }

  return {
    get: {
      single: async mid => {
        const message = await cache.lookup.mid(mid)
        if (!message) return null;
        const resolved = await resolve.email.full(message)
        return resolved
      },
      thread: async tid => {
        const thread = await cache.lookup.tid(tid)
        if (!thread) return null;
        const resolved = await resolve.thread.full(thread)
        return thread
      },
      latest: async (folder, clientCursor, limit=5000, skip=0) => {
        const threads = await cache.lookup.latest(folder, limit, skip)
        const updated = threads.filter(({ cursor }) => cursor > clientCursor)
        const resolved = await resolve.threads.partial(updated)
        return {
          exists: threads, //? we need the full list so we can process deletes
          threads: resolved
        }
      },
    },
    headers: {
      star: async (folder, uid) => await Link.flags.star(folder, uid),
      unstar: async (folder, uid) => await Link.flags.unstar(folder, uid),
      read: async (folder, uid) => await Link.flags.read(folder, uid),
      unread: async (folder, uid) => await Link.flags.unread(folder, uid)
    },
    manage: {
      copy: async (src, srcUID, dest) => await Link.copy(src, srcUID, dest),
      move: async (src, srcUID, dest) => await Link.move(src, srcUID, dest),
      delete: async (folder, uid) => Link.delete(folder, uid)
    }
  }
}