const {
  ipcMain,
  BrowserWindow
} = require('electron')
const comms = require('../utils/comms.js')
const WindowManager = require('../utils/window')

const openCalendar = bang => {
  win = new BrowserWindow({
    show: false,
    frame: process.platform == 'darwin',
    titleBarStyle: 'hidden',
    backgroundColor: '#312f2e',
    webPreferences: {
      nodeIntegration: true
    },
    width: 800,
    height: 600,
    icon: process.platform == 'darwin' ? './public/assets/img/icon.png' : './public/assets/img/app-icon/square-icon-shadow.png'
  })
  const manager = WindowManager(win, 'calendar-' + bang + ':please')
  manager.setWindow(win)
  win.show()
  win.focus()

  win.loadURL(`file://${__dirname}/../../../public/calendar.html#${bang}`, {
    // have to pretend to be Chrome to pass OAuth
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4101.0 Safari/537.36 Edg/83.0.474.0'
  })

  win.on('closed', () => {
    win = null
    manager.setWindow(null)
  })
}

ipcMain.handle('please open the calendar', async (_, q) => {
  const { bang, token } = q

  let client_secret; try { client_secret = await comms['👈'](token) } catch (e) { return { error: e } }
  if (!client_secret) return { error: "Couldn't decode client secret" }

  await openCalendar(bang)

  return { s: comms['👉'](client_secret, { success: true, payload: q }) }
})

module.exports = {}
