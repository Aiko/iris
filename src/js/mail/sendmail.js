const nodemailer = require('nodemailer')
// TODO: IPC

module.exports = (mail, host, port, username='', password='', xoauth='') => new Promise((s, j) => {
    const transporter = password ? nodemailer.createTransport({
        host: host,
        port: port,
        secure: false,
        auth: {
            user: username,
            pass: password
        }
    }) : nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: username,
            accessToken: xoauth
        }
    });
    transporter.sendMail(mail, (e, res) => e ? s({error: e}) : s(res))
})