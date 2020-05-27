const { ipcMain } = require('electron')
const comms = require('../utils/comms.js')
const nodemailer = require('nodemailer')

ipcMain.handle('please send an email', async (_, q) => {
    const {
        token,
        mail, // mail options
        email, // email address
        pass,
        xoauth2,
        secure,
        host,
        port,
    } = q

    let client_secret; try { client_secret = await comms["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    // TODO: assertions

    const transporter = !!pass ? nodemailer.createTransport({
        host, port, secure,
        auth: {
            user: email, pass,
        }
    }) : nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: email,
            accessToken: xoauth2
        }
    });;

    const d = await new Promise((s, _) => {
        transporter.sendMail(mail, (error, info) => error ? s({error,}) : s(info))
    })

    return { s: comms["👉"](client_secret, { success: true, payload: d }) }
})

ipcMain.handle('please test SMTP connection', async (_, q) => {
    const {
        token,
        email, pass, xoauth2,
        secure, host, port,
    } = q

    let client_secret; try { client_secret = await comms["👈"](token) } catch (e) { return { error: e } }
    if (!client_secret) return { error: "Couldn't decode client secret" };

    // TODO: assertions

    const transporter = !!pass ? nodemailer.createTransport({
        host, port, secure,
        auth: {
            user: email, pass,
        }
    }) : nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: email,
            accessToken: xoauth2
        }
    });;

    const d = await new Promise((s, _) => {
        transporter.verify((error, success) => error ? s({error,}) : s({success,}))
    })

    return { s: comms["👉"](client_secret, { success: true, payload: d }) }
})