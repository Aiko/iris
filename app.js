const { app, BrowserWindow } = require('electron');
if (require('electron-squirrel-startup')) app.quit();
const Store = require('electron-store')
const store = new Store()

const Mailbox = require('./src/js/email')

const platform = process.platform;
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

  entry()

  win.on('closed', () => {
    win = null
  })
}

const entry = () => {
  const signed_in = store.get('authenticated', false)

  if (signed_in) win.loadURL(`file://${__dirname}/src/public/index.html`)
  else win.loadURL('https://helloaiko.com/email/signin')
}

const getWin = () => {
  return win
}

app.on('ready', init)

app.on('window-all-closed', () => {
  if (platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (win === null) init()
})

module.exports = { Mailbox, store, entry, platform, getWin }