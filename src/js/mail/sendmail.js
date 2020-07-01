const { ipcMain } = require('electron')
const comms = require('../utils/comms.js')
const nodemailer = require('nodemailer')
const inlineBase64 = require('nodemailer-plugin-inline-base64')
const inlineCss = require('nodemailer-juice')

ipcMain.handle('please send an email', async (_, q) => {
  const {
    token,
    mail, // mail options
    user,
    pass,
    xoauth2,
    secure,
    host,
    port,
    provider
  } = q

  let client_secret; try { client_secret = await comms['👈'](token) } catch (e) { return { error: e } }
  if (!client_secret) return { error: "Couldn't decode client secret" }


  let transporter;

  switch(provider) {
    case "google": transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user,
        accessToken: xoauth2
      }
    }); break;
    case "microsoft": transporter = nodemailer.createTransport({
      service: 'hotmail',
      auth: {
        user, pass
      }
    }); break;
    default: transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user, pass
      }
    })
  }

  transporter.use('compile', inlineBase64())
  nodemailerTransport.use('compile', inLineCss({
    inlinePseudoElements: true,
  }))

  const d = await new Promise((s, _) => {
    transporter.sendMail(mail, (error, info) => error ? s({ error }) : s(info))
  })

  return { s: comms['👉'](client_secret, { success: true, payload: d }) }
})

ipcMain.handle('please test SMTP connection', async (_, q) => {
  const {
    token,
    user, pass, xoauth2,
    secure, host, port,
    provider
  } = q

  let client_secret; try { client_secret = await comms['👈'](token) } catch (e) { return { error: e } }
  if (!client_secret) return { error: "Couldn't decode client secret" }

  // TODO: assertions

  let transporter;

  switch(provider) {
    case "google": transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user,
        accessToken: xoauth2
      }
    }); break;
    case "microsoft": transporter = nodemailer.createTransport({
      service: 'hotmail',
      auth: {
        user, pass
      }
    }); break;
    default: transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user, pass
      }
    })
  }

  const d = await new Promise((s, _) => {
    transporter.verify((error, success) => error ? s({ error }) : s({ valid: success }))
  })

  return { s: comms['👉'](client_secret, { success: true, payload: d }) }
})
