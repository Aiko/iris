const IMAP = require('node-email').IMAP

module.exports = (host, port) => new IMAP({
    host: host,
    port: port
})