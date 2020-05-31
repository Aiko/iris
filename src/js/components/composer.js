const { ipcMain } = require('electron')
const WindowManager = require('../utils/window')
// FIXME: window management should probably also use middleware

// Usage:
/*
    const WindowManager = require('window.js')
    const mainWindow = ... some BrowserWindow ...

    const mainWindowManager = WindowManager(mainWindow)

    ... if some time later you assign mainWindow to a new BrowserWindow ...
    mainWindowManager.setWindow(mainWindow)
*/

const openComposer = bang => {
    const win = 
    const manager = WindowManager(win)
}

module.exports = {}