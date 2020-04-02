const colors = require('colors')

module.exports = {
    log: (...s) => console.log("[AIKO]".magenta.bgBlack, "[LOG]".white.bgBlack, ...s),
    error: (...s) => console.log("[AIKO]".magenta.bgBlack, "[ERROR]".white.bgRed, ...s),
    success: (...s) => console.log("[AIKO]".magenta.bgBlack, "[SUCCESS]".white.bgGreen, ...s),
}