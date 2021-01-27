const comms = require('../utils/comms.js')
const { ipcMain } = require('electron')
const Mouseion = require('../../../Mouseion/client')
const Client = require('emailjs-imap-client').default

/**
*? To start working with a new mailbox, first use this IPC call below to create a wrapper
*? Then bind your SockPuppeteer to the port that is returned
*? Then use SockPuppeteer as you would the normal engine API object, it will proxy req's to SockPuppet
*/

ipcMain.handle('please start up a new engine', async (_, q) => {
  const { token } = q

  let client_secret; try { client_secret = await comms['👈'](token) } catch (e) { return { error: e } }
  if (!client_secret) return { error: "Couldn't decode client secret" }

  try {
    const { port } = await Mouseion()
    return { s: comms['👉'](client_secret, { success: true, payload: port }) }
  } catch (e) { return { error: e } }
})

ipcMain.handle('please test a connection', async (_, q) => {
  const {
    token,
    host,
    port,
    user,
    pass,
    xoauth2,
    secure
  } = q

  let client_secret; try { client_secret = await comms['👈'](token) } catch (e) { return { error: e } }
  if (!client_secret) return { error: "Couldn't decode client secret" }

  const options = {
    logLevel: 40, // ERROR
    auth: xoauth2 ? {
      user, xoauth2
    } : {
      user, pass
    },
    id: {
      version: '1.0b',
      name: 'Aiko Mail'
    },
    useSecureTransport: !!secure,
    enableCompression: false // holy shit never set this to true
  }

  const testClient = new Client(host, port, options)

  try {
    await testClient.connect()
    const folders = await testClient.listMailboxes()
    // console.log("IMAP test results:", folders)
  } catch (e) { console.error(e); return { error: e } }

  await testClient.close()
  return { s: comms['👉'](client_secret, { success: true, payload: { valid: true } }) }
})