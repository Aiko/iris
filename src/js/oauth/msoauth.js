const {
  ipcMain,
  remote,
  BrowserWindow
} = require('electron')
const URL = require('url')
const request = require('request')
const BW = process.type === 'renderer' ? remote.BrowserWindow : BrowserWindow
const comms = require('../utils/comms.js')

module.exports = (clientId, tenant) => {
  ipcMain.handle('please get microsoft oauth token', async (_, q) => {
    return await new Promise(async (s, _) => {
      const { token, login_hint } = q

      let client_secret
      try { client_secret = await comms['👈'](token) } catch (e) { return s({ error: e }) }
      if (!client_secret) return s({ error: "Couldn't decode client secret" })

      let url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?`
      url += `client_id=${clientId}`
      url += '&response_type=code'
      url += '&redirect_uri=https%3A%2F%2Flogin.microsoftonline.com%2Fcommon%2Foauth2%2Fnativeclient'
      url += '&response_mode=query'
      url += (login_hint ? `&login_hint=${login_hint}` : '')
      url += '&scope=offline_access%20User.Read%20https%3A%2F%2Foutlook.office.com%2FUser.Read%20https%3A%2F%2Foutlook.office.com%2FIMAP.AccessAsUser.All%20https%3A%2F%2Foutlook.office.com%2FSMTP.Send'
      url += '&state=aikomail'

      const win = new BW({
        useContentSize: true,
        fullscreen: false
      })

      win.loadURL(url)
      win.on('closed', () => {
        return s({ error: 'User closed the Microsoft login window' })
      })

      win.webContents.on('did-navigate', (ev, newURL) => {
        const parsed = URL.parse(newURL, true)
        if (parsed.query.error) {
          s({ error: parsed.query.error_description })
          win.removeAllListeners('close')
          win.close()
        } else if (parsed.query.code || parsed.query.approvalCode) {
          const auth_code = parsed.query.code || parsed.query.approvalCode
          finish(auth_code)
        }
      })

      win.on('page-title-updated', () => {
        const title = win.getTitle()
        if (title.startsWith('Denied')) {
          // TODO: I don't think the MSFT denial page starts with Denied
          s({ error: `The request was denied with title: "${title}"` })
          win.removeAllListeners('close')
          win.close()
        } else if (title.startsWith('Success')) {
          const auth_code = title.split(/[ =]/)[2]
          finish(auth_code)
        }
      })

      let emailCode = null

      const finish = code => {
        // TODO: you need to request basic user profile token as well
        // ! but SEPARATELY!!!!! it will break imap if you do it in one token call
        // ! this is because the M in Microsoft stands for monke
        if (!emailCode) {
          const opts = {
            method: 'POST',
            url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            headers: {
              'content-type': 'application/x-www-form-urlencoded'
            },
            form: {
              client_id: clientId,
              scope: 'offline_access https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send',
              code: code,
              redirect_uri: 'https://login.microsoftonline.com/common/oauth2/nativeclient',
              grant_type: 'authorization_code'
            }
          }

          request(opts, (e, res, b) => {
            if (e) return s({ error: e })
            const d = JSON.parse(b)
            emailCode = d
            url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?`
            url += `client_id=${clientId}`
            url += '&response_type=code'
            url += '&redirect_uri=https%3A%2F%2Flogin.microsoftonline.com%2Fcommon%2Foauth2%2Fnativeclient'
            url += '&response_mode=query'
            url += (login_hint ? `&login_hint=${login_hint}` : '')
            url += '&scope=offline_access%20User.Read%20https%3A%2F%2Foutlook.office.com%2FUser.Read%20https%3A%2F%2Foutlook.office.com%2FIMAP.AccessAsUser.All%20https%3A%2F%2Foutlook.office.com%2FSMTP.Send'
            url += '&state=aikomail'
            win.loadURL(url)
          })
        }
        else {
          const opts2 = {
            method: 'POST',
            url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            headers: {
              'content-type': 'application/x-www-form-urlencoded'
            },
            form: {
              client_id: clientId,
              scope: 'user.read',
              code: code,
              redirect_uri: 'https://login.microsoftonline.com/common/oauth2/nativeclient',
              grant_type: 'authorization_code'
            }
          }
          request(opts2, (e, res, b2) => {
            if (e) return s({ error: e })
            const d2 = JSON.parse(b2)
            s({
              s: comms['👉'](client_secret, {
                success: true,
                payload: {
                  profile: d2,
                  email: emailCode
                }
              })
            })
            win.removeAllListeners('close')
            win.close()
          })
        }
      }
    })
  })

  ipcMain.handle('please refresh microsoft oauth token', async (_, q) => {
    return await new Promise(async (s, _) => {
      const { token, r_token } = q

      let client_secret
      try { client_secret = await comms['👈'](token) } catch (e) { return s({ error: e }) }
      if (!client_secret) return s({ error: "Couldn't decode client secret" })

      const opts = {
        method: 'POST',
        url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        form: {
          client_id: clientId,
          scope: 'openid EAS.AccessAsUser.All email offline_access https://graph.microsoft.com/user.read',
          refresh_token: r_token,
          grant_type: 'refresh_token'
        }
      }

      request(opts, (e, res, b) => {
        if (e) return s({ error: e })
        const d = JSON.parse(b)
        s({
          s: comms['👉'](client_secret, {
            success: true,
            payload: d
          })
        })
      })
    })
  })
}
