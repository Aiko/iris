module.exports = () => (user, cache, Folders, Log) => {
  //? TODO: maybe use an actual queue or stack with Contacts
  let update_contact_queue = []
  const update_contacts = async (email, MY_EMAIL) => {
    if (!email.M.envelope) {
      Log.error("Cannot call update contacts on an uncleaned email. Requires envelope-level parsing.")
      return null
    }

    //? lastly, we update the contact db
    if (email.folder == Folders.get().sent || email.M.envelope.from.address == MY_EMAIL) {
      //* if you sent the email, then update sent
      await cache.update.contact.sent(MY_EMAIL, email.M.envelope.from.name)
      //! we need a loop here because you risk a race condition otherwise
      for (const recipient of email.M.envelope.to) {
        const { name, address } = recipient
        await cache.update.contact.sent(address, name)
      }
    } else {
      //* otherwise, update received
      const { name, address } = email.M.envelope.from
      await cache.update.contact.received(address, name)
      //! we need a loop here to avoid race conditions
      for (const recipient of email.M.envelope.to) {
        const { name, address } = recipient
        await cache.update.contact.received(address, name)
      }
    }

    return true
  }

  return {
    sync: async () => {
      Log.log("Syncing", update_contact_queue.length, "contacts")
      for (const email of update_contact_queue)
        await update_contacts(email, user)
      update_contact_queue = []
      Log.success("Synced", update_contact_queue.length, "contacts")
      return true
    },
    queue: (...args) => {
      update_contact_queue.push(...args)
    },
    lookup: cache.lookup.contact
  }
}