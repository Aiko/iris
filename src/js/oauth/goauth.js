const {
    ipcMain,
    remote,
    BrowserWindow
} = require('electron')
const {
    google
} = require('googleapis')
const URL = require('url')
const request = require('request')
const BW = process.type === 'renderer' ? remote.BrowserWindow : BrowserWindow
const comms = require('../utils/comms.js')

module.exports = (clientId, clientSecret, scopes) => {
    let oauth2Client;

    ipcMain.handle('please get google oauth token', async (_, q) => {
        return await new Promise(async (s, _) => {
            const { token, login_hint } = q

            let client_secret;
            try { client_secret = await comms["👈"](token) }
            catch (e) { return s({ error: e }) }
            if (!client_secret) return s({ error: "Couldn't decode client secret" })

            if (!scopes.includes('profile')) scopes.push('profile')
            if (!scopes.includes('email')) scopes.push('email')
            oauth2Client = new google.auth.OAuth2(
                clientId,
                clientSecret,
                'urn:ietf:wg:oauth:2.0:oob'
            )
            oauth2Client.on('tokens', tokens => {
                s({
                    "s": comms["👉"](client_secret, {
                        success: true,
                        payload: tokens
                    })
                })
                win.removeAllListeners('close')
                win.close()
            })

            const url = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: scopes,
                login_hint: login_hint
            })

            const win = new BW({
                useContentSize: true,
                fullscreen: false
            })
            win.loadURL(url);
            win.on('closed', () => {
                return s({ error: 'User closed the Google login window' })
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
                    s({ error: `The request was denied with title: "${title}"` })
                    win.removeAllListeners('close')
                    win.close()
                } else if (title.startsWith('Success')) {
                    const auth_code = title.split(/[ =]/)[2]
                    finish(auth_code)
                }
            })

            const finish = code => oauth2Client
                .getToken(code)
                .then(res => oauth2Client.setCredentials(res.tokens))
        })
    })

    ipcMain.handle('please refresh google oauth token', async (_, q) => {
        return await new Promise(async (s, _) => {
            const { token, r_token } = q

            let client_secret;
            try { client_secret = await comms["👈"](token) }
            catch (e) { return s({ error: e }) }
            if (!client_secret) return s({ error: "Couldn't decode client secret" })

            const opts = {
                method: 'POST',
                url: 'https://oauth2.googleapis.com/token',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                },
                form: {
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: r_token,
                    grant_type: 'refresh_token'
                }
            }

            request(opts, (e, res, b) => {
                if (e) return s({ error: e })
                const d = JSON.parse(b);
                s({
                    "s": comms["👉"](client_secret, {
                        success: true,
                        payload: d
                    })
                })
            })
        })
    })
}