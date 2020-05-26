const fs = require('fs')
const fs2 = require('fs-extra');
const {
    ipcMain
} = require('electron')

// NOTE: dont give this middleware or itll break

module.exports = dir => {

    const clean_key = key =>
        key.replace(/[^A-z/\-_]/g, '');;


    const Cache = {
        load: key => {
            key = clean_key(key)
            const fp = `${dir}/${key}.json`
            fs2.ensureFileSync(fp)
            const s = fs.readFileSync(fp)
            return s
        },
        save: (key, d) => {
            key = clean_key(key)
            const fp = `${dir}/${key}.json`
            fs2.ensureFileSync(fp)
            const s = JSON.stringify(d)
            fs.writeFileSync(fp, s)
        },
        pop: key => {
            key = clean_key(key)
            const fp = `${dir}/${key}.json`
            fs2.ensureFileSync(fp)
            const s = fs.readFileSync(fp)
            fs.unlinkSync(fp)
            return s
        }
    }
    ipcMain.handle('save cache', (_, q) => {
        const { key, data } = q
        if (!key || !data) return {
            error: "Missing key and/or data"
        }
        Cache.save(key, data)
        return {
            payload: {
                success: true
            }
        }
    })
    ipcMain.handle('get cache', (_, q) => {
        const { key } = q
        if (!key) return {
            error: "Missing key"
        }
        return {
            payload: {
                success: true,
                data: Cache.load(key)
            }
        }
    })
    ipcMain.handle('pop cache', (_, q) => {
        // fetch & delete
        const { key } = q
        if (!key) return {
            error: "Missing key"
        }
        return {
            payload: {
                success: true,
                data: Cache.pop(key)
            }
        }
    })
    return Cache
}