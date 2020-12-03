const comms = require('../utils/comms.js')
const { ipcMain } = require('electron')
const Mouseion = require('../../../Mouseion/client')

ipcMain.handle('please start up a new engine', async (_, __) => {
  engine = await Mouseion()
  console.log(engine)

  let client_secret; try { client_secret = await comms['👈'](token) } catch (e) { return { error: e } }
  if (!client_secret) return { error: "Couldn't decode client secret" }

  try {
    const { port } = await Mouseion()
    return { s: comms['👉'](client_secret, { success: true, payload: port }) }
  } catch (e) { return { error: e } }
})