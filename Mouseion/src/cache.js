const crypto = require('crypto')
const fs2 = require('fs-extra')
const path = require('path')
const LinvoDB = require("linvodb3")
LinvoDB.defaults.store = { db: require("leveldown") }

const Storage = require('../utils/storage')

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
  /*
  Initialize dir like so:
  switch (process.platform) {
    case 'darwin': dir = path.join(process.env.HOME, 'Library', 'Application Support', 'Aiko Mail', 'Mouseion', dir); break
    case 'win32': dir = path.join(process.env.APPDATA, 'Aiko Mail', 'Mouseion', dir); break
    case 'linux': dir = path.join(process.env.HOME, '.Aiko Mail', 'Mouseion', dir); break
  }
  */

  const cache_dir = path.join(dir, 'cache')
  const L1_dir = path.join(cache_dir, 'L1'); const L1_cache = Storage(L1_dir)
  const L2_dir = path.join(cache_dir, 'L2'); const L2_cache = Storage(L2_dir)
  const L3_dir = path.join(cache_dir, 'L3'); const L3_cache = Storage(L3_dir)
  // TODO: attachments should get their own separated cache & db model

  const db_dir = path.join(dir, 'db'); fs2.ensureDirSync(db_dir)
  LinvoDB.dbPath = db_dir

  //! NEVER USE {var1,} in your find's
  //! it will NOT. work!

  //* all fields req
  const Message = (() => {
    const modelName = "Message"
    const schema = {
      mid: { type: String, unique: true },
      tid: { type: String },
      seen: { type: Boolean },
      starred: { type: Boolean },
      timestamp: Date,
    }
    //! the schema also includes locations which is an array of { uid, folder } objects
    //! don't incl. that in the schema unless u want ur shit to ✨ c r a s h ✨
    const options = { }
    fs2.ensureDirSync(path.join(db_dir, 'Message.db'))
    return new LinvoDB(modelName, schema, options)
  })()

  //* to build a thread, first check if any references exist as messages
  //* if they do, then append the current message to the reference's thread
  //* otherwise, create a new thread
  const Thread = (() => {
    const modelName = "Thread"
    const schema = {
      mids: [],
      date: { type: Date },
      cursor: { type: Number }, //? the modseq 👑
      aikoFolder: { type: String }, //? this should be the main folder we consider it to be in (either inbox or one of the boards)
      tid: { type: String, unique: true }
    }
    const options = { }
    fs2.ensureDirSync(path.join(db_dir, 'Thread.db'))
    return new LinvoDB(modelName, schema, options)
  })()

  const Contact = (() => {
    const modelName = "Contact"
    //* computing importance is easy
    const schema = {
      received: Number, // # of emails received with this person in the thread
      sent: Number, // # of emails sent to this person (should be weighted higher)
      lastSeen: Date, // last date interacted with (either received or sent)
      name: String, // display name
      email: { type: String, unique: true }, // associated email address
      priority: Number // computed
    }
    const options = { }
    fs2.ensureDirSync(path.join(db_dir, "Contact.db"))
    return new LinvoDB(modelName, schema, options)
  })()

  //? received + 5*sent = priority
  //* usage: contact.priority = priority(contact)
  const priority = ({ received, sent }) => received + (5*sent)

  //* structured clone (used in Electron IPC) has difficulty dealing with doc
  //* so instead, we duplicate the properties we need
  const clean = ({
    mid, tid, seen, starred, locations, timestamp
  }) => {
    return {
      locations: locations.map(({folder, uid}) => {
        return {
          folder, uid
        }
      }),
      mid, tid, seen, starred,
      timestamp
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
      if (!fallback) {
        if (in_folders.includes("INBOX")) fallback = "INBOX"
        //? we disable the below because, frankly, I don't care if it's not in the inbox.
        // else fallback = in_folders.reduceRight(_ => _)
      }
    }

    if (!main_board) main_board = fallback;

    //! we don't move/copy everything to that.
    //? this is because, if you delete a message/location, then the rest should be invariantly in the location anyways
    //? and if you add a new message/location, the location will be updated using the board rules!

    return main_board
  }

  const lookup = {
    mid: mid => new Promise((s, _) => {
      Message.findOne({ mid }, (err, doc) => {
        if (err || !doc) return s(null)
        s(clean(doc))
      })
    }),
    folder: (folder, limit=5000) => new Promise((s, _) => {
      Message.find({ 'locations.folder': folder }).limit(limit).exec((err, docs) => {
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
      Message.findOne({ locations: { folder, uid } }, (err, doc) => {
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
    /// FIXME:
    //! skip is dangerous. you can't paginate unless you're sure an email wasn't added so basically unless your client is synced
    //! but since it happens very rarely and it's 3:23AM... I'm just not going to fix it right now
    latest: (folder, limit=5000, skip=0) => new Promise((s, _) => {
      Thread.find({ aikoFolder: folder }).sort({ date: -1 }).limit(limit).exec((err, docs) => {
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
    message: (mid, folder, uid, cursor, {
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
          await new Promise((s, _) => {
            const thread = new Thread({
              mids: [], tid: tid, date: timestamp,
              cursor: cursor, aikoFolder: folder
            })
            thread.save(_ => s())
          })
        }
      }

      Message.findOne({mid,}, (err, doc) => {
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

          doc.save(err => {
            if (err) s(false)
            Thread.findOne({tid,}, async (err, doc) => {
              if (err || !doc) s(false)
              if (!doc.mids.includes(mid)) {
                doc.mids.push(mid)
                if (timestamp && doc.date < timetamp) doc.date = timestamp
                doc.cursor = cursor
                doc.aikoFolder = await uniteThread(doc)
                doc.save(err => s(!err))
              }
              else s(true)
            })
          })

        } else {
          const message = new Message({
            mid, tid, seen, starred, locations: [], timestamp
          })
          message.locations.push({folder, uid})
          message.save(err => {
            if (err) s(false)
            Thread.findOne({tid: tid}, async (err, doc) => {
              if (err || !doc) s(false)
              doc.mids.push(mid)
              if (timestamp && doc.date < timetamp) doc.date = timestamp
              doc.cursor = cursor
              doc.aikoFolder = await uniteThread(doc)
              doc.save(err => s(!err))
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
            const strategy = (thr1.mids.length == 0) ? thr1.remove : thr1.save;
            strategy((err) => {
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
                thr2.save(err => {
                  if (err) s(false)
                  //* save the changes to the message
                  msg.tid = tid
                  msg.save(err => s(!err))
                })
              })
            })
          })
        }
        else msg.save(err => s(!err))
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
          if (!contact) contact = await new Promise((s2, j) => {
            console.warn("Contact for", email, "did not exist so we are making it.")
            const contact = new Contact({
              email: email, name: name,
              received: 0,
              sent: 0,
              priority: 0,
              lastSeen: new Date(),
            })
            contact.save(err => {
              if (err) s2(null)
              else s2(contact)
            })
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
          contact.save(err => {
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
          if (!contact) contact = await new Promise((s2, j) => {
            console.warn("Contact for", email, "did not exist so we are making it.")
            const contact = new Contact({
              email: email, name: name,
              received: 0,
              sent: 0,
              priority: 0,
              lastSeen: new Date(),
            })
            contact.save(err => {
              if (err) s2(null)
              else s2(contact)
            })
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
          contact.save(err => {
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
        if (err || !thread) return s(false)

        Thread.findOne({tid: tid2}, (err, thread2) => {
          if (err || !thread2) return s(false)

          //* these are the MIDs that need to be moved
          const mids = thread1.mids

          //* kill thread 1
          thread1.remove(err => {
            if (err) s(false)

            //* append all those MIDs to thread 2
            thread2.mids.push(...mids)
            thread2.timestamp = (await Promise.all(thread2.mids.map(mid => new Promise((s, _) => {
              Message.findOne({mid}, (err, candidate) => {
                if (err || !candidate) return s(null)
                s(candidate.timestamp)
              })
            })))).sort((a, b) => b - a)?.[0]
            thread2.cursor = cursor
            thread2.aikoFolder = await uniteThread(thread2)

            thread2.save(err => {
              if (err) s(false)

              //* update each message
              const helper = mid => new Promise((resolve, _) =>
                Message.findOne({mid: mid}, (err, msg) => {
                  if (err) return resolve(false)

                  msg.tid = tid2
                  return msg.save(err => {
                    if (err) return resolve(false)
                    return resolve(true)
                  })
                })
              )

              //! this doesnt actually check if it worked
              Promise.all(mids.map(helper)).then(() => s(mids))
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
      Message.findOne({mid: mid}, (err, doc) => {
        if (err || !doc) return s(false)
        const tid = doc.tid
        doc.remove((err, _) => {
          if (err) s(false)
          Thread.findOne({tid: tid}, (err, doc) => {
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

            if (doc.mids.length == 0) doc.remove((err, _) => s(!err))
            else doc.save(err => s(!err))
          })
        })
      })
    }),
    //? removes a message from a location
    //? only removes root message if no locations left
    //! to remove the root message directly, lookup using folder & uid, get mid, remove with mid
    //! FIXME: possibly we might trigger a removal if no locations left, affecting the thread date
    location: (folder, uid, cursor) => new Promise(async (s, _) => {
      Message.findOne({locations: {folder, uid}}, (err, doc) => {
        if (err || !doc) return s(false)
        doc.locations = doc.locations.filter(l => !(l.folder == folder && l.uid == uid))
        Thread.findOne({tid: doc.tid}, async (err, thread) => {
          if (!err && thread) {
            thread.cursor = cursor
            thread.aikoFolder = await uniteThread(thread)
          }
          thread.save(_ => {
            const strategy = (doc.locations.length > 0) ? doc.save : doc.remove
            strategy(err => s(!err))
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

module.exports = Cache