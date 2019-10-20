const { app, BrowserWindow } = require('electron');
if (require('electron-squirrel-startup')) app.quit();
const Store = require('electron-store')
const store = new Store()

const GOAuth2 = require('./src/js/goauth')
const Mailbox = require('./src/js/email')

const platform = process.platform;
let win;

let cache_queue_items = []
let cache_queue_name = ''

const queueCache = async (name, emails) => {
  cache_queue_items = emails
  cache_queue_name = name
}

setInterval(async () => {
  if (cache_queue_name) {
    store.set(cache_queue_name, cache_queue_items)
    cache_queue_name = ''
    cache_queue_items = []
  }
}, 5000)

const GOAuth = GOAuth2(
  '446179098641-2t27j97cbh9c7m2ipgl726frqgq7mbu6.apps.googleusercontent.com',
  'LOrFhFdszULzm1dyFOMbzIdz',
  ['https://mail.google.com']
)

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

module.exports = { Mailbox, store, entry, platform, getWin, GOAuth, queueCache }