const path = require('path')
const fs = require('fs')
const fs2 = require('fs-extra')
const {
  ipcMain
} = require('electron')

module.exports = fp => {
  switch (process.platform) {
    case 'darwin':
      fp = path.join(process.env.HOME, 'Library', 'Application Support', 'Aiko Mail', fp)
      break
    case 'win32':
      fp = path.join(process.env.APPDATA, 'Aiko Mail', fp)
      break
    case 'linux':
      fp = path.join(process.env.HOME, '.Aiko Mail', fp)
      break
    default:
      console.log("There is no case for settings on", process.platform)
  }

  const Settings = {
    data: { },
    load: () => {
      fs2.ensureFileSync(fp)
      const s = fs.readFileSync(fp)
      if (!(s?.length > 0)) return {}
      const d = JSON.parse(s)
      return d
    },
    save: d => {
      const s = JSON.stringify(d)
      fs.writeFileSync(fp, s)
    },
    set: d => {
      Object.keys(d).map(k => Settings.data[k] = d[k])
    }
  }
  ipcMain.handle('save settings', (_, q) => {
    /*
        q = {
            pref_key: value
        }
        */
    Object.keys(q).map(k => Settings.data[k] = q[k])
    Settings.save(Settings.data)
    return Settings.data
  })
  ipcMain.handle('clear settings', _ => {
    /*
        q = {
            pref_key: value
        }
        */
    Settings.data = { }
    Settings.save(Settings.data)
    return Settings.data
  })
  ipcMain.handle('get settings', (_, q) => {
    /*
        q = [ pref_key, ... ]
        */
    const d = {}
    q.map(k => d[k] = Settings.data[k])
    return d
  })
  return Prefs
}
