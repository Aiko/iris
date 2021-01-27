const threading = require('./threading')
const retry = require('../../utils/retry')

//! Take note that this doesn't inc cursor by default. It is auto-incremented by the sync engine and nothing else.
module.exports = (
  provider,
  Folders,
  configs,
  cache, courier,
  Contacts, BoardRules,
  Cleaners, Log, Lumberjack,
  auto_increment_cursor=false
) => {
  const thread = (email, cursor) => threading(email, provider, Folders, cursor, cache, courier, Contacts, BoardRules, Cleaners, Log, Lumberjack)

  const star = async (folder, uid) => {
    try {
      //? get a new cursor
      const cursor = configs.load('cursor') + (auto_increment_cursor ? 1 : 0)

      //? create cleaner if doesn't exist
      if (!Cleaners[folder]) {
        Log.warn("Cleaner for", folder, "did not exist, generating it")
        Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
          folder == Folders.get().inbox || folder.startsWith("[Aiko]")
        ))
      }
      const Cleaner = Cleaners[folder]

      //* first, check if we have it locally
      const msg = await cache.lookup.uid(folder, uid)
      if (!msg) {
        Log.warn(`Did not have ${folder}:${uid} locally, fetching from remote`)
        //* if we don't, we call ourselves again after fetching it (peeked)
        const envelope = await courier.messages.listMessages(folder, `${uid}`, {
          peek: true,
          markAsSeen: false,
          limit: 1,
          parse: true,
          downloadAttachments: false,
          keepCidLinks: true,
          always_fetch_headers: true
        })
        if (!envelope) return false; //! the mailserver refused to hand it over >:(
        const cleaned_envelope = await Cleaner.headers(envelope)
        if (!(cleaned_envelope?.M?.envelope?.mid)) return false; //! didn't get an MID somehow
        await thread(cleaned_envelope, cursor)
        await cache.L1.cache(cleaned_envelope.M.envelope.mid, cleaned_envelope)
        return await star(folder, uid)
      }

      Log.log("Starring", `${folder}:${uid}`)
      await courier.messages.flagMessages(folder, uid, {
        add: "\\Flagged"
      })

      await cache.update.message(msg.mid, cursor, {
        starred: true
      })

      Log.success("Starred", `${folder}:${uid}`)
      configs.store('cursor', cursor)
      return true
    } catch (e) {
      Log.error(e)
      return false
    }
  }

  const unstar = async (folder, uid) => {
    try {
      //? get a new cursor
      const cursor = configs.load('cursor') + (auto_increment_cursor ? 1 : 0)

      //? create cleaner if doesn't exist
      if (!Cleaners[folder]) {
        Log.warn("Cleaner for", folder, "did not exist, generating it")
        Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
          folder == Folders.inbox || folder.startsWith("[Aiko]")
        ))
      }
      const Cleaner = Cleaners[folder]

      //* first, check if we have it locally
      const msg = await cache.lookup.uid(folder, uid)
      if (!msg) {
        Log.warn(`Did not have ${folder}:${uid} locally, fetching from remote`)
        //* if we don't, we call ourselves again after fetching it (peeked)
        const envelope = await courier.messages.listMessages(folder, `${uid}`, {
          peek: true,
          markAsSeen: false,
          limit: 1,
          parse: true,
          downloadAttachments: false,
          keepCidLinks: true,
          always_fetch_headers: true
        })
        if (!envelope) return false; //! the mailserver refused to hand it over >:(
        const cleaned_envelope = await Cleaner.headers(envelope)
        if (!(cleaned_envelope?.M?.envelope?.mid)) return false; //! didn't get an MID somehow
        await thread(cleaned_envelope, cursor)
        await cache.L1.cache(cleaned_envelope.M.envelope.mid, cleaned_envelope)
        return await unstar(folder, uid)
      }

      Log.log("Unstarring", `${folder}:${uid}`)
      await courier.messages.flagMessages(folder, uid, {
        remove: "\\Flagged"
      })

      await cache.update.message(msg.mid, cursor, {
        starred: false
      })

      Log.success("Unstarred", `${folder}:${uid}`)
      configs.store('cursor', cursor)
      return true
    } catch (e) {
      Log.error(e)
      return false
    }
  }

  const markSeen = async (folder, uid) => {
    try {
      //? get a new cursor
      const cursor = configs.load('cursor') + (auto_increment_cursor ? 1 : 0)

      //? create cleaner if doesn't exist
      if (!Cleaners[folder]) {
        Log.warn("Cleaner for", folder, "did not exist, generating it")
        Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
          folder == Folders.get().inbox || folder.startsWith("[Aiko]")
        ))
      }
      const Cleaner = Cleaners[folder]

      //* first, check if we have it locally
      const msg = await cache.lookup.uid(folder, uid)
      if (!msg) {
        Log.warn(`Did not have ${folder}:${uid} locally, fetching from remote`)
        //* if we don't, we call ourselves again after fetching it (peeked)
        const envelope = await courier.messages.listMessages(folder, `${uid}`, {
          peek: true,
          markAsSeen: false,
          limit: 1,
          parse: true,
          downloadAttachments: false,
          keepCidLinks: true,
          always_fetch_headers: true
        })
        if (!envelope) return false; //! the mailserver refused to hand it over >:(
        const cleaned_envelope = await Cleaner.headers(envelope)
        if (!(cleaned_envelope?.M?.envelope?.mid)) return false; //! didn't get an MID somehow
        await thread(cleaned_envelope, cursor)
        await cache.L1.cache(cleaned_envelope.M.envelope.mid, cleaned_envelope)
        return await markSeen(folder, uid)
      }

      Log.log("Marking as seen", `${folder}:${uid}`)
      await courier.messages.flagMessages(folder, uid, {
        add: "\\Seen"
      })

      await cache.update.message(msg.mid, cursor, {
        seen: true
      })

      Log.success("Marked as seen", `${folder}:${uid}`)
      configs.store('cursor', cursor)
      return true
    } catch (e) {
      Log.error(e)
      return false
    }
  }


  const markUnseen = async (folder, uid) => {
    try {
      //? get a new cursor
      const cursor = configs.load('cursor') + (auto_increment_cursor ? 1 : 0)

      //? create cleaner if doesn't exist
      if (!Cleaners[folder]) {
        Log.warn("Cleaner for", folder, "did not exist, generating it")
        Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
          folder == Folders.get().inbox || folder.startsWith("[Aiko]")
        ))
      }
      const Cleaner = Cleaners[folder]

      //* first, check if we have it locally
      const msg = await cache.lookup.uid(folder, uid)
      if (!msg) {
        Log.warn(`Did not have ${folder}:${uid} locally, fetching from remote`)
        //* if we don't, we call ourselves again after fetching it (peeked)
        const envelope = await courier.messages.listMessages(folder, `${uid}`, {
          peek: true,
          markAsSeen: false,
          limit: 1,
          parse: true,
          downloadAttachments: false,
          keepCidLinks: true,
          always_fetch_headers: true
        })
        if (!envelope) return false; //! the mailserver refused to hand it over >:(
        const cleaned_envelope = await Cleaner.headers(envelope)
        if (!(cleaned_envelope?.M?.envelope?.mid)) return false; //! didn't get an MID somehow
        await thread(cleaned_envelope, cursor)
        await cache.L1.cache(cleaned_envelope.M.envelope.mid, cleaned_envelope)
        return await markUnseen(folder, uid)
      }

      Log.log("Marking as unseen", `${folder}:${uid}`)
      await courier.messages.flagMessages(folder, uid, {
        remove: "\\Seen"
      })

      await cache.update.message(msg.mid, cursor, {
        seen: false
      })

      Log.success("Marked as unseen", `${folder}:${uid}`)
      configs.store('cursor', cursor)
      return true
    } catch (e) {
      Log.error(e)
      return false
    }
  }

  const copy = async (src, srcUID, dest) => {
    //? get a new cursor
    const cursor = configs.load('cursor') + (auto_increment_cursor ? 1 : 0)

    //? create cleaner if doesn't exist
    if (!Cleaners[src]) {
      Log.warn("Cleaner for", folder, "did not exist, generating it")
      Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
        src == Folders.get().inbox || src.startsWith("[Aiko]")
      ))
    }
    const Cleaner = Cleaners[src]

    //* first, check if we have it locally
    const msg = await cache.lookup.uid(src, srcUID)
    if (!msg) {
      Log.warn(`Did not have ${src}:${srcUID} locally, fetching from remote`)
      //* if we don't, we call ourselves again after fetching it (peeked)
      const envelope = await courier.messages.listMessages(src, `${srcUID}`, {
        peek: true,
        markAsSeen: false,
        limit: 1,
        parse: true,
        downloadAttachments: false,
        keepCidLinks: true,
        always_fetch_headers: true
      })?.[0]
      if (!envelope) return false; //! the mailserver refused to hand it over >:(
      const cleaned_envelope = await Cleaner.headers(envelope)
      if (!(cleaned_envelope?.M?.envelope?.mid)) return false; //! didn't get an MID somehow
      await thread(cleaned_envelope, cursor)
      await cache.L1.cache(cleaned_envelope.M.envelope.mid, cleaned_envelope)
      return await copy(src, srcUID, dest)
    }

    Log.log("Copying", `${src}:${srcUID}`, "to", dest)
    const d = await courier.messages.copyMessages(src, dest, srcUID)
    const destUID =
      d?.destSeqSet ||
      d?.copyuid?.reduceRight(_ => _) ||
      d?.payload?.OK?.[0]?.copyuid?.[2] ||
      d?.OK?.[0]?.copyuid?.[2];

    // failure
    if (!destUID) return false;

    // give it the new location in our db
    await cache.add.message(msg.mid, dest, eval(destUID), msg.subject, cursor)
    Log.success("Added", `${dest}:${destUID}`)
    configs.store('cursor', cursor)
    return destUID
  }

  const move = async (src, srcUID, dest) => {
    //? get a new cursor
    const cursor = configs.load('cursor') + (auto_increment_cursor ? 1 : 0)

    //? create cleaner if doesn't exist
    if (!Cleaners[src]) {
      Log.warn("Cleaner for", folder, "did not exist, generating it")
      Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
        src == Folders.get().inbox || src.startsWith("[Aiko]")
      ))
    }
    const Cleaner = Cleaners[src]

    //* first, check if we have it locally
    const msg = await cache.lookup.uid(src, srcUID)
    if (!msg) {
      //* if we don't, we call ourselves again after fetching it (peeked)
      const envelope = await courier.messages.listMessages(src, `${srcUID}`, {
        peek: true,
        markAsSeen: false,
        limit: 1,
        parse: true,
        downloadAttachments: false,
        keepCidLinks: true,
        always_fetch_headers: true
      })?.[0]
      if (!envelope) return false; //! the mailserver refused to hand it over >:(
      const cleaned_envelope = await Cleaner.headers(envelope)
      if (!(cleaned_envelope?.M?.envelope?.mid)) return false; //! didn't get an MID somehow
      await thread(cleaned_envelope, cursor)
      await cache.L1.cache(cleaned_envelope.M.envelope.mid, cleaned_envelope)
      return await move(src, srcUID, dest)
    }

    Log.log("Moving", `${src}:${srcUID}`, "to", dest)
    const d = await courier.messages.moveMessages(src, dest, srcUID)
    const destUID =
      d?.destSeqSet ||
      d?.copyuid?.reduceRight(_ => s_) ||
      d?.payload?.OK?.[0]?.copyuid?.[2] ||
      d?.OK?.[0]?.copyuid?.[2];

    // failure
    if (!destUID) return false;

    // give it the new location in our db
    //? we add first because if it only exists in one location,
    //? removing the location will kill the db model :(
    await cache.add.message(msg.mid, dest, eval(destUID), msg.subject, cursor)
    await cache.remove.location(src, srcUID, cursor)
    Log.success("Moved to", `${dest}:${destUID}`)
    configs.store('cursor', cursor)
    return destUID
  }

  //! for a deep delete you need to delete it from the inbox
  //! deleting from any other location will just remove it from the location!
  const remove = async (folder, uid) => {
    try {
      //? get a new cursor
      const cursor = configs.load('cursor') + (auto_increment_cursor ? 1 : 0)

      //? create cleaner if doesn't exist
      if (!Cleaners[folder]) {
        Log.warn("Cleaner for", folder, "did not exist, generating it")
        Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
          folder == Folders.get().inbox || folder.startsWith("[Aiko]")
        ))
      }
      const Cleaner = Cleaners[src]

      //* first, check if we have it locally
      const msg = await cache.lookup.uid(folder, uid)

      Log.log("Deleting", `${folder}:${uid}`)
      await courier.messages.deleteMessages(folder, uid)

      if (msg) {
        if (folder == Folders.get().inbox) await cache.remove.message(msg.mid, cursor)
        else await cache.remove.location(folder, uid, cursor)
      }

      Log.success("Deleted", `${folder}:${uid}`)
      configs.store('cursor', cursor)
      return true
    } catch (e) {
      Log.error(e)
      return false
    }
  }

  return {
    copy: retry(copy),
    move: retry(move),
    delete: retry(remove),
    flags: {
      star: retry(star),
      unstar: retry(unstar),
      read: retry(markSeen),
      unread: retry(markUnseen)
    }
  }
}