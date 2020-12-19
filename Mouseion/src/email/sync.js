const Janitor = require('../cleaner')
const batchMap = require('../../utils/do-in-batch')
const threading = require('./threading')
const Sequence = require('./sequence')


//* syncs a folder, one time
//? built to spec of RFC 4549
module.exports = () => (
  provider,
  Contacts, BoardRules,
  cache, courier,
  Cleaners, Log,
  Lumberjack, Folders,
  AI_BATCH_SIZE, THREAD_BATCH_SIZE) => async folder => {
  Log.time("Synced", folder)

  if (!Cleaners[folder]) {
    Log.warn("Cleaner for", folder, "did not exist, generating it")
    Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
      folder == Folders.get().inbox || folder.startsWith("[Aiko]")
    ))
  }
  const Cleaner = Cleaners[folder]

  //* first, open the folder to get uidNext
  const { uidNext } = await courier.folders.openFolder(folder)

  //* then, check for messages locally put in the folder
  const localMessages = (await cache.lookup.folder(folder)) || []

  //* then, check those messages' existence & flags on remote
  const localUIDs = localMessages
    .map(message => {
      const uid = message.locations.filter(L => L.folder == folder)?.[0]?.uid
      if (uid) return eval(uid)
      else return null
    })
    .filter(_ => _)
    .sort((a,b) => a - b) // defaults to lexicographic even w/ numbers
  if (localUIDs.length > 0) {
    const envelopes = await courier.messages.listMessages(folder, Sequence(localUIDs), {
      peek: true,
      onlyflags: true, //? this is an experimental optimization
      markAsSeen: false,
      limit: 300,
      parse: false,
      downloadAttachments: false,
      keepCidLinks: true
    })
    const remoteMessages = {}; envelopes.map(envelope => remoteMessages[envelope.uid] = envelope)
    await Promise.all(localMessages.map(async localMessage => {
      const remoteMessage = remoteMessages[localMessage.uid]
      //? there is a chance we should not delete emails
      //? that have the deleted flag b/c of IMAP inconsistencies
      if (!remoteMessage) {
        //* email has been removed from location, remove location from cache
        await cache.remove.location(folder, localMessage.uid)
      } else if (remoteMessage.flags.includes('\\Deleted')) {
        //* email has been directly deleted, purge away!
        await cache.remove.message(localMessage.mid)
      } else {
        //* otherwise sync flags
        const seen = remoteMessage.flags.includes('\\Seen')
        const starred = remoteMessage.flags.includes('\\Starred')
        await cache.update(localMessage.mid, { seen, starred })
      }
    }))
    Log.success(folder, "| Checked", localUIDs.length, "message flags/existence")
  }

  //* then, get the envelopes of (up to X) new emails on remote
  //? we set X = 2000 for inbox
  //? X = 400 for everything else
  const X = (folder == Folders.get().inbox) ? 2000 : 400;
  const uidLatest = (localUIDs.length < 1) ? 0 : localUIDs[localUIDs.length - 1]
  const uidMin = Math.max(uidLatest + 1, uidNext - X + 1)
  if (uidLatest + 1 < uidNext - X) {
    Log.warn(folder, "is behind by > 1000 messages, has", uidLatest, "but remote is on", uidNext)
    //* fetch envelopes for uidLatest + 1 to uidNext - 1000
    //? Y = 10000 for inbox
    //? Y = 1000 for everything else
    //? add X because it's a cursor from the Xth newest email
    const Y = X + (folder == Folders.get().inbox) ? 10000 : 1000;

    const uidMinEnv = Math.max(uidLatest + 1, uidNext - Y)
    Log.time(folder, "synced", uidNext - X - uidMinEnv, "older envelopes")
    const oldEnvelopes = await courier.messages.listMessages(folder, `${uidMinEnv}:${uidNext - X}`, {
      peek: true,
      markAsSeen: false,
      limit: Y,
      parse: true,
      downloadAttachments: false,
      keepCidLinks: true,
      always_fetch_headers: true
    })
    const cleaned_oldEnvelopes = await Promise.all(oldEnvelopes.map(Cleaner.headers))
    await batchMap(cleaned_oldEnvelopes, THREAD_BATCH_SIZE, async email => {
      if (!email.M.envelope.mid) return Log.error("Message is missing MID")
      //? we turn off the actual threading for speed :) they will be threaded on demand
      /* TODO: we need the threading to be done on demand.
        * right now, threading will assign a tid
        * then threading an email by refs will just merge the tids
        * unfortunately it wont recursively apply references
        * you can remedy this by adding a property "threaded" on the thread model
        * if that's set to true then you can merge tids
        * otherwise you need to recursively apply references for that email
        * that check should be done in threading method :)
      */
      await threading(email, provider, Folders, cache, courier, Contacts, BoardRules, Cleaners, Log, Lumberjack, actually_thread=false) //* already puts it into the DB
      await cache.L1.cache(email.M.envelope.mid, email)
    })
    Log.timeEnd(folder, "synced", uidNext - X - uidMinEnv, "older envelopes")
  }

  //* get newest full messages (up to X)
  //* fetch
  Log.log(folder, "| Fetching newest messages,", `${uidMin}:${uidNext}`)
  const emails = await courier.messages.listMessages(folder, `${uidMin}:${uidNext}`, {
    peek: false,
    markAsSeen: false,
    limit: X,
    parse: true,
    downloadAttachments: false, //* feel free to negate this and cache it later
    keepCidLinks: true //* feel free to negate this and cache it later
  })
  Log.success(folder, "| Received", emails.length, "new emails")

  //? uncomment below for intrinsic debugging
  /*
  Log.log(folder, '||\n',
    'latest uid:', uidLatest, '\n',
    '# local messages:', localMessages.length, '\n',
    'min uid:', uidMin, '\n',
    'next uid:', uidNext, '\n',
    'fetched uids:', emails.map(email => email.uid)
  )
  */

  //* parse
  const cleaned_emails = await batchMap(emails, AI_BATCH_SIZE, Cleaner.full)

  await batchMap(cleaned_emails, THREAD_BATCH_SIZE, async email => {
    if (!email.M.envelope.mid) return Log.error("Message is missing MID")
    await threading(email, provider, Folders, cache, courier, Contacts, BoardRules, Cleaners, Log, Lumberjack) //* already puts it into the DB
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
  })

  Log.timeEnd("Synced", folder)
  return true
}