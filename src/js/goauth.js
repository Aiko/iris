const {
    remote,
    BrowserWindow
} = require('electron')
const {
    OAuth2Client
} = require('google-auth-library')
const {
    Credentials
} = require('google-auth-library/build/src/auth/credentials')
const {
    google
} = require('googleapis')
const {
    stringify
} = require('querystring')
const URL = require('url')
const request = require('request')

const BW = process.type === 'renderer' ? remote.BrowserWindow : BrowserWindow

let oauth2Client;
const scopes = [];

module.exports = (clientId, clientSecret, scopes, redirectUri = 'urn:ietf:wg:oauth:2.0:oob') => {
    return {
        getToken: () => new Promise((s, j) => {
            if (!scopes.includes('profile')) scopes.push('profile')
            if (!scopes.includes('email')) scopes.push('email')
            oauth2Client = new google.auth.OAuth2(
                clientId,
                clientSecret,
                redirectUri
            )
            oauth2Client.on('tokens', tokens => {
                s(tokens)
                win.removeAllListeners('close')
                win.close()
            })

            const url = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: scopes,
            })

            const win = new BW({
                useContentSize: true,
                fullscreen: false
            })
            win.loadURL(url);
            win.on('closed', () => {
                return s({
                    error: 'window closed'
                })
            })

            win.webContents.on('did-navigate', (ev, newURL) => {
                const parsed = URL.parse(newURL, true)
                if (parsed.query.error) {
                    s({
                        error: parsed.query.error_description
                    })
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
                    s({
                        error: title
                    })
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
        }),
        refreshToken: r_token => new Promise((s, j) => {
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
                if (e) s({error: e})
                const d = JSON.parse(b);
                s(d)
            })
        })
    }
}