const fs = require('fs')
const {
    ipcMain
} = require('electron')

// FIXME: prefs should probably have middleware

module.exports = fp => {
    const Prefs = {
        data: {
            authenticated: false,
            token: '',
            firstTime: true,
        },
        load: () => {
            const s = fs.readFileSync(fp)
            const d = JSON.parse(s)
            return d
        },
        save: d => {
            const s = JSON.stringify(d)
            fs.writeFileSync(fp, s)
        }
    }
    ipcMain.handle('save preferences', (_, q) => {
        /*
        q = {
            pref_key: value
        }
        */
        Object.keys(q).map(k => Prefs.data[k] = q[k])
        Prefs.save(Prefs.data)
        return Prefs.data
    })
    ipcMain.handle('get preferences', (_, q) => {
        /*
        q = [ pref_key, ... ]
        */
        const d = {}
        q.map(k => d[k] = Prefs.data[k])
        return d
    })
    return Prefs
}