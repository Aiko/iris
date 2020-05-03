const { ipcMain } = require('electron')

// FIXME: window management should probably also use middleware

// Usage:
/*
    const WindowManager = require('window.js')
    const mainWindow = ... some BrowserWindow ...

    const mainWindowManager = WindowManager(mainWindow)

    ... if some time later you assign mainWindow to a new BrowserWindow ...
    mainWindowManager.setWindow(mainWindow)
*/

module.exports = (win => {
    let isFullscreen = false

    const addListeners = win => {
        if (win) {

            // Handlers
            const updateFullscreenStatus = s => {
                win.webContents.send('fullscreen status changed', s)
                isFullscreen = s
            }
            const updateMaximizedStatus = s =>
                win.webContents.send('maximized status changed', s);

            win.on('enter-full-screen', () => updateFullscreenStatus(true))
            win.on('enter-html-full-screen', () => updateFullscreenStatus(true))
            win.on('leave-full-screen', () => updateFullscreenStatus(false))
            win.on('leave-html-full-screen', () => updateFullscreenStatus(false))

            win.on('maximize', () => updateMaximizedStatus(true))
            win.on('unmaximize', () => updateMaximizedStatus(false))

            ipcMain.handle('get fullscreen status', (_, __) => {
                updateFullscreenStatus(isFullscreen)
                return true
            })

        }
    }

    ipcMain.handle('please minimize window', (_, __) => {
        try {
            win.minimize()
            return true
        } catch (e) {
            return { error: e }
        }
    })
    ipcMain.handle('please maximize window', (_, __) => {
        try {
            win.maximize()
            return true
        } catch (e) {
            return { error: e }
        }
    })
    ipcMain.handle('please unmaximize window', (_, __) => {
        try {
            win.unmaximize()
            return true
        } catch (e) {
            return { error: e }
        }
    })
    ipcMain.handle('please fullscreen window', (_, __) => {
        try {
            win.setFullScreen(true)
            return true
        } catch (e) {
            return { error: e}
        }
    })
    ipcMain.handle('please close window', (_, __) => {
        try {
            win.close()
            return true
        } catch (e) {
            return { error: e }
        }
    })

    addListeners(win)
    return {
        setWindow: w => {
            win = w
            addListeners(win)
        }
    }
})