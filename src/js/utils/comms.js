const { ipcMain } = require('electron')

const jwt = require('jsonwebtoken')
const crypto = require('crypto')
// reinitialized every restart :) black box
const key = crypto.randomBytes(32).toString('hex') // 32 bytes = 64 hex chars = 256 bits 💪

ipcMain.handle('key exchange', async (_, q) => {
    const { secret } = q
    // this is what the client needs to send to auth requests
    const token = jwt.sign({token: secret}, key, { expiresIn: 60 * 60 * 24 * 7 }) 
    // we double sign the result payload
    const payload = jwt.sign({token: token}, secret, { expiresIn: 60 * 60 * 24 * 7 })
    return payload
})

module.exports = {
    "👈": async token => { // incoming
        if (!token) throw 'Missing token'
        const {secret} = jwt.verify(token, key) // returns {token: secret}
        return secret
    },
    "👉": (secret, d) => { // outgoing
        return jwt.sign(d, secret, { expiresIn: 60 * 60 * 24 * 7 })
    }
}