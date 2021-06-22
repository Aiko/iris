// Contact Sync engine

module.exports = () => Registry => {

  //? Retrieve the necessary modules from the Registry
  const { user } = Registry.get('imap-config')
  const CacheDB = Registry.get('CacheDB')
  const FolderManager = Registry.get('Folder Manager')
  const Lumberjack = Registry.get('Lumberjack')

  //? Initialize a Log
  const Log = Lumberjack('Contacts')

  //? I'm using a normal list for our queue, as in JS, arrays have push/pop by default.
  const queue = []

  const update_contacts = async mid => {

    //? Find the relevant email
    const email = CacheDB.L3b.check(mid) || CacheDB.L3.check(mid) || CacheDB.L2.check(mid)
    if (!email) return Log.warn("Contact update failed for an email because it does not appear in an L2 or higher cache.")

    //? Check whether we can update contacts for this email
    if (!email.M.envelope) return Log.warn("Contact update failed for an email because it has no envelope.")

    //? Find the relevant message
    const msg = await CacheDB.lookup.mid(email.M.envelope.mid)
    if (!msg) return Log.warn("Email", email.M.envelope.mid, "does not exist in our database.");

    //? If the email has been sent by you, we need to update on sent-side.
    if (email.folder == FolderManager.get().sent || email.M.envelope.from.address == user) {
      await CacheDB.update.contact.sent(user, email.M.envelope.from.name)
      for (const { name, address } of email.M.envelope.to)
        await cache.update.contact.sent(address, name)
    }

    //? Otherwise, we need to update receive-side.
    else {
      await cache.update.contact.received(email.M.envelope.from, email.M.envelope.name)
      for (const { name, address } of email.M.envelope.to)
        await cache.update.contact.received(address, name)
    }

  }

  return {
    sync: async () => {
      const q_len = queue.length
      Log.time("Updated contacts for", q_len, "emails")

      while (queue.length > 0) await update_contacts(queue.pop())

      Log.timeEnd("Updated contacts for", q_len, "emails")

      return true
    },
    queue: (...mids) => queue.push(...mids),
    lookup: CacheDB.lookup.contact
  }
}