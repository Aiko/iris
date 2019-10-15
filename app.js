const { app, BrowserWindow } = require('electron');
if (require('electron-squirrel-startup')) app.quit();

const Mailbox = require('./src/js/email')

let win;

const init = () => {
  win = new BrowserWindow({
    show: false,
    frame: false,
    webPreferences: {
      nodeIntegration: true
    }
  })
  win.maximize()
  win.show()

  win.loadURL(`file://${__dirname}/src/public/index.html`)

  win.on('closed', () => {
    win = null
  })
}

app.on('ready', init)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (win === null) init()
})

module.exports = { Mailbox }