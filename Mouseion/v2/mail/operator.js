const retry = require('../../utils/retry')
const Janitor = require('../../utils/cleaner')

module.exports = (Registry, auto_increment_cursor=false) => {

  //? Retrieve necessary modules from registry
  const Configuration = Registry.get('Configuration')
  const Threading = Registry.get('Threading')
  const CacheDB = Registry.get('Cache')
  const Courier = Registry.get('Courier')
  const Cleaners = Registry.get('Cleaners')
  const FolderManager = Registry.get('Folder Manager')
  const Lumberjack = Registry.get('Lumberjack')

  //? Initialize a Log
  const Log = Lumberjack('Operator')

  //? Template function for single folder operations
  const single_op = (op_name, op_cb) => async (folder, uid) => {
    //? Increment the cursor for the upcoming update
    const cursor = Configuration.load('cursor') + (auto_increment_cursor ? 1 : 0)

    //? Create Cleaner if it doesn't already exist
    if (!Cleaners[folder]) {
      Log.warn("Cleaner for", folder, "did not exist, generating it")
      Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
        folder == FolderManager.get().inbox || FolderManager.startsWith("[Aiko]")
      ))
    }

    //? Assign a Cleaner
    const Cleaner = Cleaners[folder]

    //? Retrieve the message
    const msg = await (async () => {
      //? Check locally first
      const localMsg = await CacheDB.lookup.uid(folder, uid)

      //? Try the mailserver if we don't have it locally
      if (!localMsg) {
        Log.warn(`Did not have <folder:${folder}, uid:${uid}> locally, fetching from mailserver.`)
        const envelope = await Courier.messages.listMessages(folder, `${uid}`, {
          peek: true,
          markAsSeen: false,
          limit: 1,
          parse: true,
          downloadAttachments: false,
          keepCidLinks: true,
          always_fetch_headers: true
        })

        //! It's really bad if this happens.
        if (!envelope) {
          Log.error(`Unable to find <folder:${folder}, uid:${uid}> on the mailserver.`)
          return null;
        }

        const cleaned = await Cleaner.headers(envelope)

        //! Also really bad if this happens.
        if (!(cleaned?.M?.envelope?.mid)) {
          Log.error(`When fetching <folder:${folder}, uid:${uid}>, got an envelope without an MID.`)
          return null;
        }

        //? Save the email locally using the Threading function
        await Threading(cleaned, cursor)
        await CacheDB.L1.cache(cleaned.M.envelope.mid, cleaned)

        return await CacheDB.lookup.uid(folder, uid)
      }

      //? Otherwise return our local copy
      return localMsg
    })()

    //? Perform operation
    try {
      Log.log("Performing", op_name, `on <folder:${folder}, uid:${uid}>`)
      const success = await op_cb({ folder, uid, cursor, msg })
      if (success) {
        Log.success("Operation", op_name, `succeeded on <folder:${folder}, uid:${uid}>.`)
        Configuration.store('cursor', cursor)
        return true
      } else {
        Log.warn("Operation", op_name, `failed on <folder:${folder}, uid:${uid}>.`)
        return false
      }
    } catch (e) {
      Log.error("Operation", op_name, `failed on <folder:${folder}, uid:${uid}> due to error:`, e)
      return false
    }
  }

  //? Some common single folder operations
  const star_op = async ({ folder, uid, msg, cursor }) => {
    try {
      await Courier.messages.flagMessages(folder, uid, {
        add: "\\Flagged"
      })

      await CacheDB.update.message(msg.mid, cursor, {
        starred: true
      })

      return true
    } catch (e) {
      Log.error(`Failed to star <folder:${folder}, uid:${uid}> due to error:`, e)
      return false
    }
  }
  const unstar_op = async ({ folder, uid, msg, cursor }) => {
    try {
      await Courier.messages.flagMessages(folder, uid, {
        remove: "\\Flagged"
      })

      await CacheDB.update.message(msg.mid, cursor, {
        starred: false
      })

      return true
    } catch (e) {
      Log.error(`Failed to unstar <folder:${folder}, uid:${uid}> due to error:`, e)
      return false
    }
  }
  const seen_op = async ({ folder, uid, msg, cursor }) => {
    try {
      await Courier.messages.flagMessages(folder, uid, {
        add: "\\Seen"
      })

      await CacheDB.update.message(msg.mid, cursor, {
        seen: true
      })

      return true
    } catch (e) {
      Log.error(`Failed to mark <folder:${folder}, uid:${uid}> as seen due to error:`, e)
      return false
    }
  }
  const unseen_op = async ({ folder, uid, msg, cursor }) => {
    try {
      await Courier.messages.flagMessages(folder, uid, {
        remove: "\\Seen"
      })

      await CacheDB.update.message(msg.mid, cursor, {
        seen: false
      })

      return true
    } catch (e) {
      Log.error(`Failed to mark <folder:${folder}, uid:${uid}> as unseen due to error:`, e)
      return false
    }
  }
  const remove_op = async ({ folder, uid, msg, cursor }) => {
    try {
      await Courier.messages.deleteMessages(folder, uid)

      //? If it's not in the inbox does a location pop, but if it is then perma-deletes it
      if (folder == FolderManager.get().inbox) await CacheDB.remove.message(msg.mid, cursor)
      else await CacheDB.remove.location(folder, uid, cursor)

      return true
    } catch (e) {
      Log.error(`Failed to mark <folder:${folder}, uid:${uid}> as seen due to error:`, e)
      return false
    }
  }

  //? Template function for multi-folder operations
  const multi_op = (op_name, op_cb) => async (srcFolder, srcUID, destFolder) => {
    //? Increment the cursor for the upcoming update
    const cursor = Configuration.load('cursor') + (auto_increment_cursor ? 1 : 0)

    //? Create Cleaner if it doesn't already exist
    if (!Cleaners[srcFolder]) {
      Log.warn("Cleaner for", srcFolder, "did not exist, generating it")
      Cleaners[srcFolder] = await Janitor(Lumberjack, srcFolder, useAiko=(
        srcFolder == FolderManager.get().inbox || FolderManager.startsWith("[Aiko]")
      ))
    }

    //? Assign a Cleaner
    const Cleaner = Cleaners[srcFolder]

    //? srcUID needs to be a number
    srcUID = eval(srcUID)

    //? Retrieve the message
    const msg = await (async () => {
      //? Check locally first
      const localMsg = await CacheDB.lookup.uid(srcFolder, srcUID)

      //? Try the mailserver if we don't have it locally
      if (!localMsg) {
        Log.warn(`Did not have <folder:${srcFolder}, uid:${srcUID}> locally, fetching from mailserver.`)
        const envelope = await Courier.messages.listMessages(srcFolder, `${srcUID}`, {
          peek: true,
          markAsSeen: false,
          limit: 1,
          parse: true,
          downloadAttachments: false,
          keepCidLinks: true,
          always_fetch_headers: true
        })

        //! It's really bad if this happens.
        if (!envelope) {
          Log.error(`Unable to find <folder:${srcFolder}, uid:${srcUID}> on the mailserver.`)
          return null;
        }

        const cleaned = await Cleaner.headers(envelope)

        //! Also really bad if this happens.
        if (!(cleaned?.M?.envelope?.mid)) {
          Log.error(`When fetching <folder:${srcFolder}, uid:${srcUID}>, got an envelope without an MID.`)
          return null;
        }

        //? Save the email locally using the Threading function
        await Threading(cleaned, cursor)
        await CacheDB.L1.cache(cleaned.M.envelope.mid, cleaned)

        return await CacheDB.lookup.uid(srcFolder, srcUID)
      }

      //? Otherwise return our local copy
      return localMsg
    })()

    //? Perform operation
    try {
      Log.log("Performing", op_name, `from <folder:${srcFolder}, uid:${srcUID}> to ${destFolder}.`)
      const destUID = await op_cb({ srcFolder, srcUID, destFolder, cursor, msg })
      if (destUID) {
        Log.success("Operation", op_name, `succeeded from <folder:${srcFolder}, uid:${srcUID}> to <folder:${destFolder}, uid:${destUID}>.`)
        Configuration.store('cursor', cursor)
        return destUID
      } else {
        Log.warn("Operation", op_name, `failed from <folder:${srcFolder}, uid:${srcUID}> to ${destFolder}.`)
        return null
      }
    } catch (e) {
      Log.error("Operation", op_name, `failed on <folder:${folder}, uid:${uid}> due to error:`, e)
      return false
    }
  }

  //? Some common multi-folder operations
  const copy_op = async ({ srcFolder, srcUID, destFolder, cursor, msg }) => {
    try {
      const d = await Courier.messages.copyMessages(srcFolder, destFolder, srcUID)
      const destUID =
        d?.destSeqSet ||
        d?.copyuid?.reduceRight(_ => _) ||
        d?.payload?.OK?.[0]?.copyuid?.[2] ||
        d?.OK?.[0]?.copyuid?.[2];
      ;;

      if (destUID) await CacheDB.add.message(msg.mid, destFolder, eval(destUID), msg.subject, cursor)

      return destUID
    } catch (e) {
      Log.error(`Failed to copy <folder:${srcFolder}, uid:${srcUID}> to ${destFolder} due to error:`, e)
      return null
    }
  }
  const move_op = async ({ srcFolder, srcUID, destFolder, cursor, msg }) => {
    try {
      const d = await Courier.messages.moveMessages(srcFolder, destFolder, srcUID)
      const destUID =
        d?.destSeqSet ||
        d?.copyuid?.reduceRight(_ => _) ||
        d?.payload?.OK?.[0]?.copyuid?.[2] ||
        d?.OK?.[0]?.copyuid?.[2];
      ;;

      if (destUID) {
        await CacheDB.add.message(msg.mid, destFolder, eval(destUID), msg.subject, cursor)
        await CacheDB.remove.location(srcFolder, eval(srcUID), cursor)
      }

      return destUID
    } catch (e) {
      Log.error(`Failed to copy <folder:${srcFolder}, uid:${srcUID}> to ${destFolder} due to error:`, e)
      return null
    }
  }

  //? Composite and Aliased Operations
  const archive_op = ({ folder, uid, msg, cursor }) => move_op({
    srcFolder: folder,
    srcUID: uid,
    destFolder: FolderManager.get().archive
  })

  return {
    copy: retry(multi_op(copy_op)),
    move: retry(multi_op(move_op)),
    delete: retry(single_op(remove_op)),
    flags: {
      star: retry(single_op(star_op)),
      unstar: retry(single_op(unstar_op)),
      read: retry(single_op(seen_op)),
      unread: retry(single_op(unseen_op))
    }
  }
}