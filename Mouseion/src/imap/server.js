//! Like bindings but is meant to be used as another process using IPC

const Forest = require('../../utils/logger')
const Lumberjack = Forest()

const EmailJS = require('emailjs-imap-client')
const Client = EmailJS.default
const simpleParser = require('mailparser').simpleParser
const batchMap = require('../../utils/do-in-batch')

//* takes Lumberjack logger and config as parameters
const PostOffice = () => {
  const Log = Lumberjack('Post Office')

  let host, port, user, pass, oauth, secure;

  let client; //* the IMAP client must be a singleton
  //* for multiple mailboxes make multiple post offices
  //* btw to change params like oauth, need to close and connect for reconnect
  //* there is no reconnect helper to force you to acknowledge what is actually happening (a cold start)

  const close = async () => {
    Log.log("Closing client")
    if (!client) return Log.warn("Tried to close a client but the client does not exist/has already been closed.")

    try { await client.close() } catch {
      Log.error("A client exists but could not be closed. There is a risk of a memory leak occurring.")
    }

    client = null
  }

  const connect = async (h, p, u, w, o, s) => {
    host = h || host;
    port = p || port;
    user = u || user;
    pass = w || pass;
    oauth = o || oauth;
    secure = s || secure;
    Log.log("Connecting to IMAP server")
    if (client) await close()

    const options = {
      logLevel: EmailJS.LOG_LEVEL_ERROR,
      auth: oauth ? {
        user,
        xoauth2: oauth
      } : {
        user, pass
      },
      id: {
        version: '1.0b',
        name: 'Aiko Mail'
      },
      useSecureTransport: !!secure,
      enableCompression: false // this breaks things
    }

    Log.log("using options", options)

    client = new Client(host, port, options)
    Log.log("Establishing IMAP connection.")
    await client.connect()
    Log.log("Created client for", user, "on", host)

    client.onupdate = function (path, type, value) {
      if (type === 'exists') {
        // TODO: check for new messages here
      }
    }

    client.onerror = error => {
      Log.error('Client error:', error)
      close() // async
      // TODO: send error to some callback or listener
    }

    return true
  }

  const checkConnect = async () => {
    if (!client) await connect()
    return true
  }

  const getFolders = async () => {
    if (!client) await connect()
    Log.log("Getting folders")

    const folderTree = await client.listMailboxes().catch(Log.error)
    const helper = mailboxes => {
      const folders = {}
      if (mailboxes.children) {
        mailboxes.children.map(mailbox => {
          folders[mailbox.name] = {
            delimiter: mailbox.delimiter,
            path: mailbox.path,
            children: helper(mailbox),
            flags: mailbox.flags,
            listed: mailbox.listed,
            subscribed: mailbox.subscribed
          }
        })
      }
      return folders
    }
    return helper(folderTree)
  }

  const newFolder = async path => {
    if (!client) await connect()
    Log.log("Getting new folders")

    await client.createMailbox(path).catch(Log.error)
    return Log.success("Created folder", path)
  }

  const deleteFolder = async path => {
    if (!client) await connect()
    Log.log("Deleting folder")

    await client.deleteMailbox(path).catch(Log.error)
    Log.success("Deleted folder", path)
  }

  const openFolder = async path => {
    if (!client) await connect()

    if (!path) return Log.error("Path provided was null?")

    const details = await client.selectMailbox(path, { readOnly: false, condstore: true }).catch(Log.error)

    return details
  }

  const listMessages = async (
    path, sequence,
    {
      peek=true, markAsSeen=false,
      onlyflags=false, always_fetch_headers=false,
      modseq, limit, parse=true,
      downloadAttachments=false, keepCidLinks=false
    } ={} // kissy face operator lets us make default named parameters
  ) => {
    if (!client) await connect()
    if (sequence.startsWith('0')) {
      Log.error("Sequences cannot contain '0' as a startpoint")
      return []
    }

    const query = ['uid', 'flags']
    if (!onlyflags) query.push('envelope')
    if (peek && always_fetch_headers) query.push('body.peek[HEADER.FIELDS (REFERENCES)]')
    if (!peek) query.push('bodystructure', markAsSeen ? 'body[]' : 'body.peek[]')

    const options = { byUid: true }
    if (modseq) options.changedSince = modseq

    Log.log("Fetching via IMAP...")
    // Log.time(path, "| FETCH", sequence)
    let messages = await client.listMessages(path, sequence, query, options).catch(Log.error)
   //  Log.timeEnd(path, "| FETCH", sequence)
    if (!messages) return []

    //* return the last n messages because they're passed in chronological order
    if (limit && messages.length > limit) messages = messages.slice(messages.length - limit)

    if ((!peek || always_fetch_headers) && parse) {
      //* parses the message body
      Log.log(path, "| Parsing", sequence)
      const key = (() => {
        if (peek && always_fetch_headers) return 'body[header.fields (references)]'
        else return 'body[]'
        //* can put other keys in here if you have different query constructors
      })()

      messages = await batchMap(messages, 500, async msg => {
        msg.parsed = await simpleParser(msg[key], {
          skipHtmlToText: true,
          skipTextToHtml: true,
          maxHtmlLengthToParse: 100 * 1000,
          skipAttachments: !downloadAttachments,
          keepCidLinks,
        })
        msg.parsed.textAsHtml = ''
        if (!downloadAttachments) {
          msg.parsed.attachments = msg.parsed.attachments.map(attachment => {
            // strip the content of the attachments but return their names
            // (unless it is an aiko specific attachment)
            if (!(attachment?.contentType?.includes('aiko/'))) attachment.content = null
            return attachment
          })
        }

        delete msg[key]
        return msg
      })
      Log.success(path, "| Parsed", sequence)
    }

    return messages
  }

  const searchMessages = async (path, query) => {
    /*
    * Query format examples:

    * SEARCH UNSEEN
      query = {unseen: true}

    * SEARCH KEYWORD 'flagname'
      query = {keyword: 'flagname'}

    * SEARCH HEADER 'subject' 'hello world'
      query = {header: ['subject', 'hello world']};

    * SEARCH UNSEEN HEADER 'subject' 'hello world'
      query = {unseen: true, header: ['subject', 'hello world']};

    * SEARCH OR UNSEEN SEEN
      query = {or: {unseen: true, seen: true}};

    * SEARCH UNSEEN NOT SEEN
      query = {unseen: true, not: {seen: true}}

    * SINCE 2011-11-23
      query = {since: new Date(2011, 11, 23, 0, 0, 0)}
    */

    await openFolder(path) //* sanity check
    const results = await client.search(path, query, {byUid: true}).catch(Log.error)

    return results
  }

  const deleteMessages = async (path, sequence) => {
    if (!client) await connect()
    Log.log("Deleting messages")

    await client.deleteMessages(path, sequence, { byUid: true }).catch(Log.error)
    return Log.success("Deleted messages", path, sequence)
  }

  const flagMessages = async (path, sequence, flags) => {
    /*
      Flags Object:
      {
          set|add|remove: [String (flag)]
      }

      set is basically a remove all + add
    */

    if (!client) await connect()
    Log.log("Flagging messages")

    await client.setFlags(path, sequence, flags, { byUid: true, silent: true }).catch(Log.error)
    return Log.success("Set flags", flags, "for", path, sequence)
  }

  const copyMessages = async (srcPath, dstPath, sequence) => {
    if (!client) await connect()
    Log.log("Copying messages")

    const results = await client.copyMessages(srcPath, sequence, dstPath, { byUid: true }).catch(Log.error)
    Log.success("Copied messages", srcPath, sequence, "to", dstPath)
    return results
  }

  const moveMessages = async (srcPath, dstPath, sequence) => {
    if (!client) await connect()
    Log.log("Moving messages")

    const results = await client.moveMessages(srcPath, sequence, dstPath, { byUid: true }).catch(Log.error)
    Log.success("Copied messages", srcPath, sequence, "to", dstPath)
    return results
  }

  const addMessage = async (path, message, flags) => {
    if (!client) await connect()
    Log.log("Adding messages")

    await client.upload(path, message, { flags: flags || ['\\Seen'] }).catch(Log.error)
    return Log.success("Uploaded message to", path)
  }

  return {
    network: { connect, close, checkConnect },
    folders: { getFolders, newFolder, deleteFolder, openFolder },
    messages: {
      listMessages, searchMessages,
      deleteMessages, addMessage,
      copyMessages, moveMessages,
      flagMessages
    }
  }
}

const courier = PostOffice();


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
      case 'network.connect': return await attempt(courier.network.connect)
      case 'network.close': return await attempt(courier.network.close)
      case 'network.checkConnect': return await attempt(courier.network.checkConnect)

      case 'folders.getFolders': return await attempt(courier.folders.getFolders)
      case 'folders.newFolder': return await attempt(courier.folders.newFolder)
      case 'folders.deleteFolder': return await attempt(courier.folders.deleteFolder)
      case 'folders.openFolder': return await attempt(courier.folders.openFolder)

      case 'messages.listMessages': return await attempt(courier.messages.listMessages)
      case 'messages.searchMessages': return await attempt(courier.messages.searchMessages)
      case 'messages.deleteMessages': return await attempt(courier.messages.deleteMessages)
      case 'messages.addMessage': return await attempt(courier.messages.addMessage)
      case 'messages.copyMessages': return await attempt(courier.messages.copyMessages)
      case 'messages.moveMessages': return await attempt(courier.messages.moveMessages)
      case 'messages.flagMessages': return await attempt(courier.messages.flagMessages)

      default: return error('You fucked up cunty!');
    }
  } catch (e) {
    return process.send(JSON.stringify({
      error: e + '\n' + (new Error)
    }))
  }
});