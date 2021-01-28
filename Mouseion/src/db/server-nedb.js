const crypto = require('crypto')
const fs2 = require('fs-extra')
const path = require('path')
const Datastore = require('nedb')

const Storage = require('../../utils/storage')

//* 3 caching levels
//* Level 1 -- envelope based caching (no parse)
//* Level 2 -- strip parsed caching (parsed but without some keys like attachments)
//* Level 3 -- full load caching (parsed with all keys)

//* Need 2 db models
//* 1. Folder+UID to Message ID and Thread ID
//* 2. Threads which contain Message ID arrays with their messages and a Thread ID

// TODO: attachment caching

//* dir should be unique, i.e. the email address
const Cache = (dir => {

  const cache_dir = path.join(dir, 'cache')
  const L1_dir = path.join(cache_dir, 'L1'); const L1_cache = Storage(L1_dir)
  const L2_dir = path.join(cache_dir, 'L2'); const L2_cache = Storage(L2_dir)
  const L3_dir = path.join(cache_dir, 'L3'); const L3_cache = Storage(L3_dir)
  // TODO: attachments should get their own separated cache & db model

  const db_dir = path.join(dir, 'db'); fs2.ensureDirSync(db_dir)

  const Message = new Datastore({ filename: path.join(db_dir, 'MessageDB'), autoload: true, timestampData: true })
  const newMessage = ({
    mid=null, tid=null, seen=false, starred=false, subject='No Subject', timestamp=null,
    locations=[]
  }={}) => new Promise((s, _) => {
    Message.insert({
      mid, tid, seen, starred, subject, timestamp, locations
    }, (err, doc) => {
      if (err || !doc) return s({ error: err || 'Failed to save' })
      return s(doc)
    })
  })

  const Thread = new Datastore({ filename: path.join(db_dir, 'ThreadDB'), autoload: true, timestampData: true })
  const newThread = ({
    mids=[], date=null, cursor=-1, aikoFolder=null, tid=null
  }={}) => new Promise((s, _) => {
    Thread.insert({
      mids, date, cursor, aikoFolder, tid
    }, (err, doc) => {
      if (err || !doc) return s({ error: err || 'Failed to save' })
      return s(doc)
    })
  })

  const Contact = new Datastore({ filename: path.join(db_dir, 'ContactDB'), autoload: true, timestampData: true })
  const newContact = ({
    received=0, sent=0, lastSeen=null, name=null, email=null, priority=0
  }={}) => new Promise((s, _) => {
    Contact.insert({
      received, sent, lastSeen, name, email, priority
    }, (err, doc) => {
      if (err || !doc) return s({ error: err || 'Failed to save' })
      return s(doc)
    })
  })

  //? received + 5*sent = priority
  //* usage: contact.priority = priority(contact)
  const priority = ({ received, sent }) => received + (5*sent)

  //* structured clone (used in Electron IPC) has difficulty dealing with doc
  //* so instead, we duplicate the properties we need
  const clean = ({
    mid, tid, seen, starred, locations, timestamp, subject
  }) => {
    return {
      locations: locations.map(({folder, uid}) => {
        return {
          folder, uid
        }
      }),
      mid, tid, seen, starred,
      timestamp, subject
    }
  }

  const cleanThread = ({
    mids, tid, date, aikoFolder, cursor
  }) => {
    return {
      aikoFolder, date, tid, cursor,
      mids: mids.map(mid => mid)
    }
  }

  const uniteThread = async thread => {
    //? loop through the entire thread, returning a common board
    //? by default, uses the latest board as the main board
    //? by default, only copies messages that are in the inbox to the board
    if (!thread) return; // for the sake of making things easy with nulls

    let main_board = null
    let fallback = null
    const thread_messages = await Promise.all(thread.mids.map(mid => new Promise((s, _) => {
      Message.findOne({mid}, (err, candidate) => {
        if (err || !candidate) return s(null)
        s(candidate)
      })
    })))
    if (thread_messages.length == 0) return null;
    //? sort ascending date
    thread_messages.sort((m1, m2) => (new Date(m1.timestamp)) - (new Date(m2.timestamp)))
    //? find main board (working backwards because only latest matters)
    for (let i = thread_messages.length - 1; i > -1; i--) {
      const in_folders = thread_messages[i].locations.map(({ folder }) => folder)
      const in_boards = in_folders.filter(folder => folder.startsWith('[Aiko]'));
      if (in_boards.length > 0) {
        main_board = in_boards.reduceRight(_ => _)
        break;
      }
      if (in_folders.includes("INBOX")) {
        main_board = "INBOX"
        break;
      }
      //? disabling the below because if you move a thread out of a board this is what should happen
      /*
      if (!fallback) {
        if (in_folders.includes("INBOX")) fallback = "INBOX"
        //? we disable the below because, frankly, I don't care if it's not in the inbox.
        // else fallback = in_folders.reduceRight(_ => _)
      }
      */
    }

    if (!main_board) main_board = fallback;

    //! we don't move/copy everything to that.
    //? this is because, if you delete a message/location, then the rest should be invariantly in the location anyways
    //? and if you add a new message/location, the location will be updated using the board rules!

    return main_board
  }

  const timeThread = async thread => {
    if (!thread) return null;
    const thread_messages = await Promise.all(thread.mids.map(mid => new Promise((s, _) => {
      Message.findOne({mid}, (err, candidate) => {
        if (err || !candidate) return s(null)
        s(candidate)
      })
    })))
    if (thread_messages.length == 0) return null;
    //? sort descending date
    thread_messages.sort((m1, m2) => (new Date(m2.timestamp)) - (new Date(m1.timestamp)))
    return thread_messages[0].timestamp
  }

  const lookup = {
    mid: mid => new Promise((s, _) => {
      Message.findOne({ mid }, (err, doc) => {
        if (err || !doc) return s(null)
        s(clean(doc))
      })
    }),
    folder: (folder, limit=5000) => new Promise((s, _) => {
      Message.find({ locations: { $elemMatch: { folder, } } }).limit(limit).exec((err, docs) => {
        if (err || !docs) return s(null)
        s(docs.map(clean))
      })
    }),
    //? threads version of folder
    aikoFolder: (folder, limit=5000) => new Promise((s, _) => {
      Thread.find({ aikoFolder: folder }).limit(limit).exec((err, docs) => {
        if (err || !docs) return s(null)
        s(docs.map(cleanThread))
      })
    }),
    uid: (folder, uid) => new Promise((s, _) => {
      Message.findOne({ locations: { $elemMatch: { folder, uid } } }, (err, doc) => {
        if (err || !doc) return s(null)
        s(clean(doc))
      })
    }),
    tid: tid => new Promise((s, _) => {
      Thread.findOne({tid: tid}, (err, doc) => {
        if (err || !doc) return s(null)
        // manual specification so we don't pass the document
        s(cleanThread(doc))
      })
    }),
    withSubject: subject => new Promise((s, _) => {
      Message.find({ subject, }).exec((err, docs) => {
        if (err || !docs) return s([])
        s(docs.map(clean))
      })
    }),
    /// FIXME:
    //! skip is dangerous. you can't paginate unless you're sure an email wasn't added so basically unless your client is synced
    //! but since it happens very rarely and it's 3:23AM... I'm just not going to fix it right now
    latest: (aikoFolder, limit=5000, skip=0) => new Promise((s, _) => {
      Thread.find({ aikoFolder, }).sort({ date: -1 }).limit(limit).exec((err, docs) => {
        if (err || !docs) return s(null)
        s(docs.map(cleanThread))
      })
    }),
    contact: partial => new Promise((s, _) => { //? performs typeahead
      const pattern = partial.length < 3 ?
        `^${partial}` : `${partial}`
      const regex = new RegExp(pattern, 'gi')
      Contact.find({
        $or: [
          { name: { $regex: regex }},
          { email: { $regex: regex }}
        ]
      }).sort({ priority: -1, lastSeen: 1 }).exec((err, docs) => {
        if (err || !docs) return s(null)
        s(docs)
      })
    }),
  }

  const add = {
    //! be careful when using overwrite
    //! you have to provide EVERY PARAMETER when using overwite
    //! also keep in mind this will change the thread's core location (aikoFolder)
    message: (mid, folder, uid, subject, cursor, {
      overwrite=false,
      seen=false,
      starred=false,
      timestamp=null, // not even overwrite will overwrite timestamp
      tid
    } ={}) => new Promise(async (s, _) => {
      if (!tid) {
        const exists = await lookup.mid(mid)
        if (exists?.tid) tid = exists.tid
        else {
          const makeTID = () => new Promise(async (s, _) => {
            tid = crypto.randomBytes(6).toString('hex')
            Thread.findOne({tid: tid}, async (err, doc) => {
              if (doc) s(await makeTID())
              else s(tid)
            })
          })
          tid = await makeTID()
          await new Promise(async (s, _) => {
            const thread = await newThread({
              mids: [], tid: tid, date: timestamp,
              cursor: cursor, aikoFolder: folder
            })
            s()
          })
        }
      }

      Message.findOne({mid,}, async (err, doc) => {
        if (err) return s(false)

        if (doc) {
          const existing_location = doc.locations
            .map((_, i) => {_.index = i; return _})
            .filter(l => l.folder == folder)?.[0]
          //* if the document already has a location in that folder,
          if (existing_location) {
            if (overwrite)
              doc.locations[existing_location.index].uid = uid
          } else {
            doc.locations.push({ folder, uid })
          }

          if (overwrite) {
            doc.tid = tid
            doc.seen = seen
            doc.starred = starred
          }

          timestamp = timestamp || doc.timestamp

          Message.update({ mid, }, doc, {}, (err) => {
            if (err) {
              console.error(err)
              return s(false)
            }
            Thread.findOne({tid,}, async (err, doc) => {
              if (err) {
                console.error(err)
                return s(false)
              }
              if (!doc) return s(false)
              if (!(doc.mids.includes(mid))) {
                doc.mids.push(mid)
                if (timestamp && doc.date < timestamp) doc.date = timestamp
                doc.date = await timeThread(doc)
              }
              doc.cursor = cursor
              doc.aikoFolder = await uniteThread(doc)
              Thread.update({ tid, }, doc, {}, (err) => s(!err))
            })
          })

        } else {
          const message = await newMessage({
            mid, tid, seen, starred, locations: [], timestamp, subject
          })
          message.locations.push({folder, uid})
          Message.update({ mid, }, message, {}, (err) => {
            if (err) s(false)
            Thread.findOne({tid: tid}, async (err, doc) => {
              if (err || !doc) return s(false)
              doc.mids.push(mid)
              if (timestamp && doc.date < timestamp) doc.date = timestamp
              doc.cursor = cursor
              doc.aikoFolder = await uniteThread(doc)
              doc.date = await timeThread(doc)
              Thread.update({ tid, }, doc, {}, (err) => s(!err))
            })
          })
        }
      })
    }),
    //! you should never manually create a thread
    //! instead, save the parent message, then update its thread
    thread: (..._) => { throw new Error("Do not try to create a Thread object manually") },
    //! you should never manually create a contact
    //! instead, just use the "received" or "sent" methods from update
    //! they will automatically create the contact if not existing, and update priority
    contact: (..._) => { throw new Error("Do not try to create a contact manually.")}
  }

  const update = {
    //! be careful, do not use this to MOVE emails.
    //! rather, you should remove the db model for the old folder/uid shallow
    //! and then use the add api above to create an entry in the new folder/uid
    //! btw this also does not update the aiko folder :)
    message: (mid, cursor, {
      tid, seen=null, starred=null
    }) => new Promise(async (s, _) => {
      Message.findOne({mid: mid}, (err, msg) => {
        if (err || !msg) return s(false)

        if (seen != null) msg.seen = seen
        if (starred != null) msg.starred = starred

        //* if we have to change thread
        if (tid && msg.tid != tid) {
          //* remove it from its existing thread
          Thread.findOne({tid: msg.tid}, async (err, thr1) => {
            if (err || !thr1) s(false)
            thr1.mids = thr1.mids.filter(m => m != mid)
            //? this little bit of code computes the timestamp of a thread
            thr1.timestamp = (await Promise.all(thr1.mids.map(mid => new Promise((s, _) => {
              Message.findOne({mid}, (err, candidate) => {
                if (err || !candidate) return s(null)
                s(candidate.timestamp)
              })
            })))).sort((a, b) => b - a)?.[0]
            thr1.aikoFolder = await uniteThread(thr1)
            const cb = ((err) => {
              if (err) s(false)
              //* add it to the new thread
              Thread.findOne({tid: tid}, async (err, thr2) => {
                if (err || !thr2) s(false)
                thr2.mids.push(mid)
                thr2.timestamp = (await Promise.all(thr2.mids.map(mid => new Promise((s, _) => {
                  Message.findOne({mid}, (err, candidate) => {
                    if (err || !candidate) return s(null)
                    s(candidate.timestamp)
                  })
                })))).sort((a, b) => b - a)?.[0]
                thr2.cursor = cursor
                thr2.aikoFolder = await uniteThread(thr2)
                Message.update({ tid, }, thr2, {}, (err) => {
                  if (err) s(false)
                  //* save the changes to the message
                  msg.tid = tid
                  Message.update({ mid, }, msg, {}, (err) => s(!err))
                })
              })
            })
            if (thr1.mids.length == 0) {
              Thread.remove({ tid: msg.tid }, {}, cb)
            } else {
              Thread.update({ tid: msg.tid }, thr1, {}, cb)
            }
          })
        }
        else Message.update({ mid, }, msg, {}, (err)  => s(!err))
      })
    }),
    refreshThread: tid => new Promise(async (s, _) => {
      Thread.findOne({ tid, }, async (err, thr) => {
        if (err || !thr) return s(false)

        thr.aikoFolder = await uniteThread(thr)
        Thread.update({ tid, }, thr, {}, (err) => s(!err))
      })
    }),
    //! you should never manually update a thread
    //! instead, update its children
    thread: (..._) => { throw new Error("Do not try to update a Thread object manually") },
    contact: {
      //? name cannot be null :) we need it to create the contact
      received: (email, name) => new Promise(async (s, _) => {
        if (!name) name = ''
        name = name.trim()
        email = email.toLowerCase().trim()
        Contact.findOne({email: email}, async (err, contact) => {
          if (err) return s(null)
          if (!contact) contact = await new Promise(async (s2, j) => {
            console.warn("Contact for", email, "did not exist so we are making it.")
            const contact = await newContact({
              email: email, name: name,
              received: 0,
              sent: 0,
              priority: 0,
              lastSeen: new Date(),
            })
            s2(contact)
          })
          if (!contact) return s(null)

          //? first update received
          contact.received += 1
          //? then update lastSeen to now
          contact.lastSeen = new Date()
          //? then recalculate priority
          contact.priority = priority(contact)
          //? then update name
          contact.name = name
          //? finally, save the contact
          Contact.update({ email, }, contact, {}, (err) => {
            if (err) return s(null)
            return s(true)
          })
        })
      }),
      sent: (email, name) => new Promise(async (s, _) => {
        if (!name) name = ''
        name = name.trim()
        email = email.toLowerCase().trim()
        Contact.findOne({email: email}, async (err, contact) => {
          if (err) return s(null)
          if (!contact) contact = await new Promise(async (s2, j) => {
            console.warn("Contact for", email, "did not exist so we are making it.")
            const contact = await newContact({
              email: email, name: name,
              received: 0,
              sent: 0,
              priority: 0,
              lastSeen: new Date(),
            })
            s2(contact)
          })
          if (!contact) return s(null)

          //? first update received
          contact.sent += 1
          //? then update lastSeen to now
          contact.lastSeen = new Date()
          //? then recalculate priority
          contact.priority = priority(contact)
          //? then update name
          contact.name = name
          //? finally, save the contact
          Contact.update({ email, }, contact, {}, (err) => {
            if (err) return s(null)
            return s(true)
          })
        })
      })
    }
  }

  const merge = {
    //? will merge thread 1 into thread 2, and delete thread 1
    thread: (tid1, tid2, cursor) => new Promise(async (s, _) => {
      Thread.findOne({tid: tid1}, (err, thread1) => {
        if (err || !thread1) return s({error: err || "cant find thread 1", at: 'finding tid1'})

        Thread.findOne({tid: tid2}, (err, thread2) => {
          if (err || !thread2) return s(({error: err || "cant find thread 2", at: 'finding tid2'}))

          //* these are the MIDs that need to be moved
          const mids = JSON.parse(JSON.stringify(thread1.mids))

          thread1.mids = []
          thread1.cursor = cursor
          Thread.update({ tid: tid1 }, thread1, {}, (err) => {
            if (err) return s({error: err, at: 'saving thread1'})

            //* kill thread 1
            Thread.remove({ tid: tid1 }, {}, async (err) => {
              if (err) return s({error: err, at: 'removing thread1'})
              //* append all those MIDs to thread 2
              thread2.mids.push(...(mids.filter(mid => !(thread2.mids.includes(mid)))))
              thread2.timestamp = (await Promise.all(thread2.mids.map(mid => new Promise((s, _) => {
                Message.findOne({mid}, (err, candidate) => {
                  if (err || !candidate) return s(null)
                  s(candidate.timestamp)
                })
              })))).sort((a, b) => b - a)?.[0]
              thread2.cursor = cursor
              thread2.aikoFolder = await uniteThread(thread2)

              Thread.update({ tid: tid2 }, thread2, {}, async (err) => {
                if (err) return s({error: err, at: 'saving thread2'})

                //* update each message
                //! FIXME: this doesnt work clearly lol
                const helper = mid => new Promise((resolve, _) =>
                  Message.findOne({mid: mid}, (err, msg) => {
                    if (err || !msg) {
                      return resolve({error: err, mid})
                    }

                    msg.tid = tid2
                    return Message.update({ mid, }, msg, {}, (err) => {
                      if (err) return resolve({error: err})
                      return resolve({success: true, mid})
                    })
                  })
                )

                const results = await Promise.all(mids.map(helper))
                const errors = results.filter(({ error }) => !!error)
                if (errors.length > 0) return s(errors)
                else return s(mids)
              })

            })
          })
        })

      })
    }),
    //! impossible to merge imap messages
    message: (..._) => { throw new Error("Message objects cannot be merged.") }
  }

  const remove = {
    //! doesn't modify thread location
    message: (mid, cursor) => new Promise(async (s, _) => {
      Message.findOne({mid: mid}, async (err, doc) => {
        if (err || !doc) return s(false)
        const tid = doc.tid
        Message.remove({ mid, }, {}, (err) => {
          if (err) s(false)
          Thread.findOne({tid: tid}, async (err, doc) => {
            if (err || !doc) return s(false)

            doc.mids = doc.mids.filter(m => m != mid)
            doc.timestamp = (await Promise.all(doc.mids.map(mid => new Promise((s, _) => {
              Message.findOne({mid}, (err, candidate) => {
                if (err || !candidate) return s(null)
                s(candidate.timestamp)
              })
            })))).sort((a, b) => b - a)?.[0]
            doc.cursor = cursor
            doc.aikoFolder = await uniteThread(doc)
            doc.date = await timeThread(doc)

            if (doc.mids.length == 0) {
              Thread.remove({tid}, {}, (err) => s(!err))
            } else {
              Thread.update({ tid, }, doc, {}, (err) => s(!err))
            }
          })
        })
      })
    }),
    //? removes a message from a location
    //? only removes root message if no locations left
    //! to remove the root message directly, lookup using folder & uid, get mid, remove with mid
    //! FIXME: possibly we might trigger a removal if no locations left, affecting the thread date
    location: (folder, uid, cursor) => new Promise(async (s, _) => {
      Message.findOne({locations: { $elemMatch: {folder, uid}}}, (err, doc) => {
        if (err || !doc) return s(false)
        doc.locations = doc.locations.filter(l => !(l.folder == folder && l.uid == uid))
        Thread.findOne({tid: doc.tid}, async (err, thread) => {
          if (!err && thread) {
            thread.cursor = cursor
            thread.aikoFolder = await uniteThread(thread)
          }
          Thread.update({ tid: doc.tid }, thread, {}, _ => {
            if (doc.locations.length > 0) {
              Message.update({ mid: doc.mid }, doc, {}, (err) => s(!err))
            } else {
              Message.remove({ mid: doc.mid }, {}, (err) => s(!err))
            }
          })
        })
      })
    }),
    //! you should never manually remove a thread
    //! instead, remove or update all of its children
    thread: (..._) => { throw new Error("Do not try to remove a Thread object manually") }
  }

  return {
    L1: {
      cache: L1_cache.store,
      check: L1_cache.load,
    },
    L2: {
      cache: L2_cache.store,
      check: L2_cache.load,
    },
    L3: {
      cache: L3_cache.store,
      check: L3_cache.load,
    },
    lookup,
    add,
    update,
    remove,
    merge,
  }
})

let cache;

const psucc = id => payload => process.send(JSON.stringify({
  success: true,
  payload, id
}))
const perr = id => msg => process.send(JSON.stringify({
  error: msg + '\n' + (new Error),
  id
}))

process.on('message', async m => {
  /*
  * m should be 'please ' + JSON stringified message
  * object should have the following structure:
  * {
  *   id: String, // some random string to make ipc easier
  *   action: String,
  *   args: [...] // must ALWAYS be set. for no args just do []
  * }
  */

  try {
    // TODO: eventually some security or so here beyond please...
    const { id, action, args } = JSON.parse(m.substr('please '.length))

    const success = psucc(id)
    const error = perr(id)

    const attempt = async method => {
      try {
        const result = await method(...args)
        return success(result)
      } catch (e) {
        return error(e)
      }
    }

    switch (action) {
      case 'create':
        if (cache) return error("Cache already exists.")
        cache = Cache(...args)
        return success(true);

      case 'L1.cache': return await attempt(cache.L1.cache)
      case 'L1.check': return await attempt(cache.L1.check)

      case 'L2.cache': return await attempt(cache.L2.cache)
      case 'L2.check': return await attempt(cache.L2.check)

      case 'L3.cache': return await attempt(cache.L3.cache)
      case 'L3.check': return await attempt(cache.L3.check)

      case 'lookup.mid': return await attempt(cache.lookup.mid)
      case 'lookup.folder': return await attempt(cache.lookup.folder)
      case 'lookup.aikoFolder': return await attempt(cache.lookup.aikoFolder)
      case 'lookup.withSubject': return await attempt(cache.lookup.withSubject)
      case 'lookup.uid': return await attempt(cache.lookup.uid)
      case 'lookup.tid': return await attempt(cache.lookup.tid)
      case 'lookup.latest': return await attempt(cache.lookup.latest)
      case 'lookup.contact': return await attempt(cache.lookup.contact)

      case 'add.message': return await attempt(cache.add.message)
      case 'add.thread': return await attempt(cache.add.thread)
      case 'add.contact': return await attempt(cache.add.contact)

      case 'update.message': return await attempt(cache.update.message)
      case 'update.thread': return await attempt(cache.update.thread)
      case 'update.refreshThread': return await attempt(cache.update.refreshThread)
      case 'update.contact.received': return await attempt(cache.update.contact.received)
      case 'update.contact.sent': return await attempt(cache.update.contact.sent)

      case 'remove.message': return await attempt(cache.remove.message)
      case 'remove.thread': return await attempt(cache.remove.thread)
      case 'remove.location': return await attempt(cache.remove.location)

      case 'merge.message': return await attempt(cache.merge.message)
      case 'merge.thread': return await attempt(cache.merge.thread)

      default: return error('You fucked up cunty!');
    }
  } catch (e) {
    return process.send(JSON.stringify({
      error: e + '\n' + (new Error)
    }))
  }
});