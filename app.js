const { app, BrowserWindow } = require('electron');
if (require('electron-squirrel-startup')) app.quit();
const Store = require('electron-store')
const store = new Store()

const GOAuth2 = require('./src/js/goauth')
const MSAuth = require('./src/js/msoauth')
const Mailbox = require('./src/js/email')
const Mailman = require('./src/js/sendmail')

const platform = process.platform;
let win;

let cacheQueue = []

const queueCache = async (name, emails) => {
  cacheQueue.push({name, emails})
}

setInterval(() => {
  if (cacheQueue.length == 0) return;
  const { name, emails } = cacheQueue.pop()
  store.set(name, emails)
}, 5000)

const GOAuth = GOAuth2(
  '446179098641-5cafrt7dl4rsqtvi5tjccqrbknurtr7k.apps.googleusercontent.com',
  null, // no client secret if you registered as iOS app! wheeee
  ['https://mail.google.com']
)

const MSOauth = MSAuth(
  '65b77461-4950-4abb-b571-ad129d9923a3'
)


const init = () => {
  win = new BrowserWindow({
    show: false,
    frame: false,
    webPreferences: {
      nodeIntegration: true
    },
    icon: './src/public/assets/img/icon.png'
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

module.exports = { Mailbox, store, entry, platform, getWin, GOAuth, MSOauth, queueCache, Mailman }