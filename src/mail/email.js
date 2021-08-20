const comms = require('../utils/comms.js')
const { ipcMain } = require('electron')
const { EightySix } = require('../../Mouseion/dist/client')
const Client = require('emailjs-imap-client').default

/**
*? To start working with a new mailbox, first use this IPC call below to create a wrapper
*? Then bind your SockPuppeteer to the port that is returned
*? Then use SockPuppeteer as you would the normal engine API object, it will proxy req's to SockPuppet
*/

const engines = {}
const engineConfigs = {}

ipcMain.handle('please update engine config', async (_, q) => {
  const { token, config, force } = q
  const email = config.user

  let client_secret; try { client_secret = await comms['👈'](token) } catch (e) { return { error: e } }
  if (!client_secret) return { error: "Couldn't decode client secret" }
  if (!engines[email]) return { error: "Engine does not exist." }

  try {
    const agent = engines[email]
    await agent.proxy('reconnect')(config)
    engineConfigs[email] = config
    return { s: comms['👉'](client_secret, { success: true, payload: agent.port }) }
  } catch (e) { return { error: e } }
})


ipcMain.handle('please get or start the corresponding engine', async (_, q) => {
  const { token, config, force } = q
  const email = config.user

  let client_secret; try { client_secret = await comms['👈'](token) } catch (e) { return { error: e } }
  if (!client_secret) return { error: "Couldn't decode client secret" }

  if (engines[email]) {
    if (force) {
      const agent = engines[email]
      await agent.proxy('close')()
      delete engines[email];
    }
    else return { s: comms['👉'](client_secret, { success: true, payload: engines[email] }) }
  }
  try {
    const agent = await EightySix.init(config)
    engines[email] = agent
    engineConfigs[email] = config
    return { s: comms['👉'](client_secret, { success: true, payload: agent.port }) }
  } catch (e) { return { error: e } }
})

ipcMain.handle('please test a connection', async (_, q) => {
  const {
    token,
    host,
    port,
    user,
    pass,
    oauth,
    xoauth2,
    secure
  } = q

  let client_secret; try { client_secret = await comms['👈'](token) } catch (e) { return { error: e } }
  if (!client_secret) return { error: "Couldn't decode client secret" }

  const options = {
    logLevel: 40, // ERROR
    auth: (oauth || xoauth2) ? {
      user, xoauth2: oauth || xoauth2
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