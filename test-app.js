const { app, BrowserWindow, session } = require('electron')

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36 Edg/93.0.961.52"

app.on('ready', () => {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders["User-Agent"] = UA
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  })

  const win = new BrowserWindow({
    height: 600,
    width: 800
  })
  win.loadURL(
    "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fmail.google.com%20profile%20email&login_hint=&response_type=code&client_id=446179098641-5cafrt7dl4rsqtvi5tjccqrbknurtr7k.apps.googleusercontent.com&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob",
    {
      userAgent: UA
    }
  )
  win.show()
})