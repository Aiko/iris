const {
    remote,
    BrowserWindow
} = require('electron')
const URL = require('url')
const request = require('request')

const BW = process.type === 'renderer' ? remote.BrowserWindow : BrowserWindow

let oauth2Client;
const scopes = [];

module.exports = (clientId) => {
    return {
        getToken: (login_hint=null) => new Promise((s, j) => {
            const url = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?'
            + `client_id=${clientId}`
            + '&response_type=code'
            + '&redirect_uri=https%3A%2F%2Flogin.microsoftonline.com%2Fcommon%2Foauth2%2Fnativeclient'
            + '&response_mode=query'
            + login_hint ? `&login_hint=${login_hint}` : ''
            + `&scope=openid%20wl.imap%20offline_access%20https%3A%2F%2Fgraph.microsoft.com%2Fuser.read`
            + '&state=aikomail'

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

            const finish = code => {
                const opts = {
                    method: 'POST',
                    url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    form: {
                        client_id: clientId,
                        scope: 'openid wl.imap offline_access https://graph.microsoft.com/user.read',
                        code: code,
                        redirect_uri: 'https://login.microsoftonline.com/common/oauth2/nativeclient',
                        grant_type: 'authorization_code'
                    }
                }

                request(opts, (e, res, b) => {
                    if (e) s({error: e})
                    const d = JSON.parse(b)
                    s(d)
                })
            }
        }),
        refreshToken: r_token => new Promise((s, j) => {
            const opts = {
                method: 'POST',
                url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                },
                form: {
                    client_id: clientId,
                    scope: 'openid wl.imap offline_access https://graph.microsoft.com/user.read',
                    refresh_token: r_token,
                    grant_type: 'refresh_token'
                }
            }

            request(opts, (e, res, b) => {
                if (e) s({error: e})
                const d = JSON.parse(b)
                s(d)
            })
        })
    }
}