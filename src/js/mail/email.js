const Client = require('emailjs-imap-client').default
const { ipcMain } = require('electron')

const jwt = require('jsonwebtoken')
const crypto = require('crypto')
// reinitialized every restart :) black box
const key = crypto.randomBytes(32).toString('hex') // 32 bytes = 64 hex chars = 256 bits 💪

ipcMain.handle('key exchange', async (_, q) => {
    const { secret } = q
    // this is what the client needs to send to auth requests
    const token = jwt.sign({token: secret}, key, { expiresIn: 60 * 60 * 24 * 7 }) 
    // we double sign the result payload
    const payload = jwt.sign({token: token}, secret, { expiresIn: 60 * 60 * 24 * 7 })
    return payload
})

const assertions = true // please don't disable assertions
let connected = false
let currentFolder = null
let client = null

// just so that it folds up in the IDE I'm using
if (true) {
    /*

        Hi there! If you're reading this you must have inherited
        this bit of the codebase from me.


        WHEN USING ipcMain.on:
            I'm trying to pretend/use the ipcMain from Electron here
            like it's a route handler from Express.js. Basically I work
            the same way as we do in the server backend, where we have
            routes that resolve to requests and response objects.

            The only real/major difference in coding style here is that
            the request and response are reversed here. This is mostly
            because the ipcMain is actually more like socket.io in how
            it operates, it's basically pubsub, and the "response" is
            actually the "event" that you can reply and do stuff with.
            You can actually also make it synchronous by setting the
            returnValue property. The "request" is the argument. But
            that's not pretty nor is it simple so I just converted it
            to s and q similar to Express. Just remember that they are
            flipped in the callback function!

        WHEN USING ipcMain.handle:
            It's basically just a normal JS async handler. You handle an
            event with an async callback, and the IPC module does the rest,
            including subscribing to your callback's completion (await)
            and sending the value returned by it to the caller (in this
            case, probably the renderer script calling ipcMain.invoke)

        Also please use IPC as much as possible. This is because
        that is fully asynchronous and so the main thread does not
        hold up, which would then cause the renderer to wait for
        the main which is running the renderer which makes the GUI
        freeze up fully.


        The general style should be like this:

        ipcMain.handle(event being called, async (_, q) => {
            const { my arguments to unfold } = q

            if (assertions) {
                make some assertions about the args
            }

            do some more stuff

            return response
        })

    */
}

module["👈"] = async token => {
    if (!token) throw 'Missing token'
    const {secret} = jwt.verify(token, key) // returns {token: secret}
    return secret
}

module["👉"] = (secret, d) => {
    return jwt.sign(d, secret, { expiresIn: 60 * 60 * 24 * 7 })
}

// Create new Mail Client
ipcMain.handle('make new client', async (_, q) => {
    const {
        token,
        host,
        port,
        user,
        pass,
        xoauth2,
        secure
    } = q

    let client_secret; try { client_secret = await module["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    // assertions
    if (assertions) {
        if (!user) return { error: 'No user provided to "make new client"' };
        if (!pass && !xoauth2) return { error: 'No password or XOAuth2 token provided to "make new client"' };
        if (!host) return { error: 'No host provided to "make new client"' };
        if (!port) return { error: 'No port provided to "make new client"' };
    }

    client = null
    connected = false

    const options = {
        auth: {
            user: user,
            pass: pass,
            xoauth2: xoauth2
        },
        id: {
            version: '1.0-beta',
            name: 'Aiko Mail'
        },
        useSecureTransport: !!secure,
        enableCompression: true
    }

    client = new Client(host, port, options)

    return { s: module["👉"](client_secret, { success: true, payload: q }) }
})

// Connect to Mail Server
ipcMain.handle('connect to server', async (_, q) => {
    const { token } = q

    let client_secret; try { client_secret = await module["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    if (assertions) {
        if (!client) return { error: 'No client has been made for use in "connect to server"' };
        if (connected) return { error: 'Already connected but still called "connect to server"' };
    }

    try { await client.connect() } catch (e) { return { error: e } }
    connected = true

    return { s: module["👉"](client_secret, { success: true, payload: q }) }
})

// Disconnect from Mail Server
ipcMain.handle('disconnect from server', async (_, q) => {
    const { token } = q

    let client_secret; try { client_secret = await module["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    if (assertions) {
        if (!client) return { error: 'No client has been made for use in "disconnect from server"' };
        if (!connected) return { error: 'Not connected but still called "disconnect from server"' };
    }

    // could call client.logout here too
    await client.close()
    connected = false

    return { s: module["👉"](client_secret, { success: true, payload: q }) }
})

// Get Folders from Mailbox
ipcMain.handle('please list folders', async (_, q) => {
    const { token } = q

    let client_secret; try { client_secret = await module["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    if (assertions) {
        if (!client) return { error: 'No client has been made for use in "please list folders"' };
        if (!connected) return { error: 'Not connected but still called "please list folders" - are you missing an IPC call to "connect to server"?' };
    }

    let mailboxes; try { mailboxes = await client.listMailboxes() } catch (e) { return { error: e } }
    if (!mailboxes || !mailboxes.children) return { error: 'Did not get any mailboxes returned when calling client.listMailboxes() in "please list folders"' };

    /*
    Aiko Folder Object:
    {
        "folder name": {
            props,
            children: folder object
        }
    }
    */

    const helper = mailboxes => {
        const folders = {}
        if (mailboxes.children) mailboxes.children.map(mailbox => {
            folders[mailbox.name] = {
                delimiter: mailbox.delimiter,
                path: mailbox.path,
                children: helper(mailbox),
                flags: mailbox.flags,
                listed: mailbox.listed,
                subscribed: mailbox.subscribed
            }
        })
        return folders
    }
    const folders = helper(mailboxes)

    return { s: module["👉"](client_secret, { success: true, payload: folders }) }
})

// Create Folder
ipcMain.handle('please make a new folder', async (_, q) => {
    const { path, token } = q

    let client_secret; try { client_secret = await module["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    if (assertions) {
        if (!client) return { error: 'No client has been made for use in "please make a new folder"' };
        if (!connected) return { error: 'Not connected but still called "please make a new folder" - are you missing an IPC call to "connect to server"?' };
        if (!path) return { error:  'No path provided to "please make a new folder"' }
    }

    try { await client.createMailbox(path) } catch (e) { return { error: e } }

    return { s: module["👉"](client_secret, { success: true, payload: q }) }
})

// Delete Folder
ipcMain.handle('please delete a folder', async (_, q) => {
    const { path, token } = q

    let client_secret; try { client_secret = await module["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    if (assertions) {
        if (!client) return { error: 'No client has been made for use in "please delete a folder"' };
        if (!connected) return { error: 'Not connected but still called "please delete a folder" - are you missing an IPC call to "connect to server"?' };
        if (!path) return { error:  'No folder path provided to "please delete a folder"' }
    }

    try { await client.deleteMailbox(path) } catch (e) { return { error: e } }

    return { s: module["👉"](client_secret, { success: true, payload: q }) }
})

// Open a Folder
ipcMain.handle('please open a folder', async (_, q) => {
    const { path, token, readOnly } = q
    const options = {
        readOnly: !!readOnly,
        condstore: true
    }

    let client_secret; try { client_secret = await module["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    if (assertions) {
        if (!client) return { error: 'No client has been made for use in "please open a folder"' };
        if (!connected) return { error: 'Not connected but still called "please open a folder" - are you missing an IPC call to "connect to server"?' };
        if (!path) return { error:  'No folder path provided to "please open a folder"' }
    }

    let info; try { info = await client.selectMailbox(path) } catch (e) { return { error: e } }
    if (!info) return { error: 'Did not receive any mailbox info back when calling client.selectMailbox(' + path + ') in "please open a folder"' };

    /*
    Mailbox Info Object:
    {
        readOnly: true | false,
        exists: Number,
        flags: [String],
        permanentFlags: [String],
        uidValidity: Number,
        uidNext: Number,
        highestModseq: String (of a Number that can't be handled by JS)
    }
    */

    currentFolder = path
    return { s: module["👉"](client_secret, { success: true, payload: info }) }
})

// Get Emails
ipcMain.handle('please get emails', async (_, q) => {
    const { path, sequence, peek, token } = q
    const query = ['uid', 'flags', peek ? 'body.peek[HEADER.FIELDS (FROM)]' : 'body.peek[]']
    const options = {
        byUid: true,
    }
    if (modseq) options.changedSince = modseq

    let client_secret; try { client_secret = await module["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    if (assertions) {
        if (!client) return { error: 'No client has been made for use in "please get emails"' };
        if (!connected) return { error: 'Not connected but still called "please get emails" - are you missing an IPC call to "connect to server"?' };
        if (!path) return { error:  'No folder path provided to "please get emails"' }
        if (!sequence) return { error:  'No message sequence provided to "please get emails"' }
    }

    let messages; try { messages = await client.listMessages(path, sequence, query, options) } catch (e) { return { error: e } }
    if (!messages || messages.length===0)
        return { error: `Did not receive any messages back when calling client.listMessages(${path}, ${sequence}, [${peek.join(',')}]) in "please get emails"` };

    /*
    {
        "#": Number,
        "uid": Number,
        "flags": [String],
        "envelope": {
            "date": String (timestamp),
            "subject": String,
            "from": [{"name": String, "address": String}],
            "sender": [{"name": String, "address": String}],
            "reply-to": [{"name": String, "address": String}],
            "to": [{"name": String, "address": String}],
            "cc": [{"name": String, "address": String}],
            "bcc": [{"name": String, "address": String}],
            "in-reply-to": String (message id),
            "message-id": String (message id)
        }
    }

    body key varies unfortunately, TODO: remove variance in body key
    */

    currentFolder = path
    return { s: module["👉"](client_secret, { success: true, payload: messages }) }
})

// Search Emails
ipcMain.handle('please look for emails', async (_, q) => {
    const { path, query, modseq, token } = q
    const options = {
        byUid: true
    }

    let client_secret; try { client_secret = await module["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    /*
    Query format:

    SEARCH UNSEEN
    query = {unseen: true}
    SEARCH KEYWORD 'flagname'
    query = {keyword: 'flagname'}
    SEARCH HEADER 'subject' 'hello world'
    query = {header: ['subject', 'hello world']};
    SEARCH UNSEEN HEADER 'subject' 'hello world'
    query = {unseen: true, header: ['subject', 'hello world']};
    SEARCH OR UNSEEN SEEN
    query = {or: {unseen: true, seen: true}};
    SEARCH UNSEEN NOT SEEN
    query = {unseen: true, not: {seen: true}}
    SINCE 2011-11-23
    query = {since: new Date(2011, 11, 23, 0, 0, 0)}
    */

    if (assertions) {
        if (!client) return { error: 'No client has been made for use in "please look for emails"' };
        if (!connected) return { error: 'Not connected but still called "please look for emails" - are you missing an IPC call to "connect to server"?' };
        if (!path) return { error:  'No folder path provided to "please look for emails"' }
        if (!query) return { error:  'No search query provided to "please look for emails"' }
    }

    let results; try { results = client.search(path, query, options) } catch (e) { return { error: e } }
    if (!results || results.length===0)
        return { error: `Did not receive any UIDs back when calling client.listMessages(${path}, ${sequence}, [${peek.join(',')}]) in "please get emails"` };

    currentFolder = path
    return { s: module["👉"](client_secret, { success: true, payload: results }) }
})

// Set flags
ipcMain.handle('please set email flags', async (_, q) => {
    const { path, sequence, flags, blind, token } = q
    const options = {
        byUid: true,
    }
    if (blind) options.silent = true

    let client_secret; try { client_secret = await module["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    /*
    Flags Object:
    {
        set|add|remove: [String (flag)]
    }

    set is basically a remove all + add
    */

    if (assertions) {
        if (!client) return { error: 'No client has been made for use in "please set email flags"' };
        if (!connected) return { error: 'Not connected but still called "please set email flags" - are you missing an IPC call to "connect to server"?' };
        if (!path) return { error:  'No folder path provided to "please set email flags"' }
        if (!sequence) return { error:  'No message sequence provided to "please set email flags"' }
        if (!flags) return { error:  'No flags provided to "please set email flags"' }
    }

    let messages; try { messages = await client.setFlags(path, sequence, flags, options) } catch (e) { return { error: e } }
    if ((!messages || messages.length===0) && !blind)
        return { error: `Did not receive any messages back when calling client.setFlags in "please set email flags"` };

    currentFolder = path
    if (!blind) return { s: module["👉"](client_secret, { success: true, payload: messages }) }
    return;
})

// Delete Emails
ipcMain.handle('please delete emails', async (_, q) => {
    const { path, sequence, token } = q
    const options = {
        byUid: true,
    }

    let client_secret; try { client_secret = await module["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    if (assertions) {
        if (!client) return { error: 'No client has been made for use in "please delete emails"' };
        if (!connected) return { error: 'Not connected but still called "please delete emails" - are you missing an IPC call to "connect to server"?' };
        if (!path) return { error:  'No folder path provided to "please delete emails"' }
        if (!sequence) return { error:  'No message sequence provided to "please delete emails"' }
    }

    try { await client.deleteMessages(path, sequence, options) } catch (e) { return { error: e } }

    currentFolder = path
    return { s: module["👉"](client_secret, { success: true, payload: q }) }
})

// Copy Emails
ipcMain.handle('please copy emails', async (_, q) => {
    const { srcPath, dstPath, sequence } = q
    const options = {
        byUid: true,
    }

    let client_secret; try { client_secret = await module["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    if (assertions) {
        if (!client) return { error: 'No client has been made for use in "please copy emails"' };
        if (!connected) return { error: 'Not connected but still called "please copy emails" - are you missing an IPC call to "connect to server"?' };
        if (!srcPath) return { error:  'No source folder path provided to "please copy emails"' }
        if (!dstPath) return { error:  'No destination folder path provided to "please copy emails"' }
        if (!sequence) return { error:  'No message sequence provided to "please copy emails"' }
    }

    try { await client.copyMessages(srcPath, sequence, dstPath, options) } catch (e) { return { error: e } }

    return { s: module["👉"](client_secret, { success: true, payload: q }) }
})

// Copy Emails
ipcMain.handle('please move emails', async (_, q) => {
    const { srcPath, dstPath, sequence } = q
    const options = {
        byUid: true,
    }

    let client_secret; try { client_secret = await module["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    if (assertions) {
        if (!client) return { error: 'No client has been made for use in "please move emails"' };
        if (!connected) return { error: 'Not connected but still called "please move emails" - are you missing an IPC call to "connect to server"?' };
        if (!srcPath) return { error:  'No source folder path provided to "please move emails"' }
        if (!dstPath) return { error:  'No destination folder path provided to "please move emails"' }
        if (!sequence) return { error:  'No message sequence provided to "please move emails"' }
    }

    try { await client.moveMessages(srcPath, sequence, dstPath, options) } catch (e) { return { error: e } }

    return { s: module["👉"](client_secret, { success: true, payload: q }) }
})

// TODO: client.onupdate lets us listen for EXISTS messages and update the mailbox with pubsub
// TODO: not technically threadsafe as currentFolder is modified so some sort of async here to prevent races would be good!