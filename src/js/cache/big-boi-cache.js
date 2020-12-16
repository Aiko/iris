const path = require('path')
const fs = require('fs')
const fs2 = require('fs-extra')
const {
  ipcMain, session
} = require('electron')

// NOTE: dont give this middleware or itll break

module.exports = dir => {
  switch (process.platform) {
    case 'darwin': dir = path.join(process.env.HOME, 'Library', 'Application Support', 'Aiko Mail', dir); break
    case 'win32': dir = path.join(process.env.APPDATA, 'Aiko Mail', dir); break
    case 'linux': dir = path.join(process.env.HOME, '.Aiko Mail', dir); break
  }

  const clean_key = key =>
    key.replace(/[^A-z0-9/\-_]/g, '')

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
    if (!key || !data) {
      return {
        error: 'Missing key and/or data'
      }
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
    if (!key) {
      return {
        error: 'Missing key'
      }
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
    if (!key) {
      return {
        error: 'Missing key'
      }
    }
    return {
      payload: {
        success: true,
        data: Cache.pop(key)
      }
    }
  })
  ipcMain.handle('kill cache', (_, q) => {
    fs2.removeSync(dir) // FIXME: could be unsafe
    return {
      payload: {
        success: true,
      }
    }
  })
  ipcMain.handle('clear all cache', (_, q) => {
    await session.defaultSession.clearCache()
    return { 
      payload: {
        success: true
      }
    }
  })
  return Cache
}