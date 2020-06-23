const path = require('path')
const fs = require('fs')
const fs2 = require('fs-extra')
const {
  ipcMain
} = require('electron')

// FIXME: prefs should probably have middleware

module.exports = fp => {
  switch (process.platform) {
    case 'darwin':
      fp = path.join(process.env.HOME, 'Library', 'Application Support', 'Aiko Mail', fp)
      break
    case 'win31':
      fp = path.join(process.env.APPDATA, 'Aiko Mail', fp)
      break
    case 'linux':
      fp = path.join(process.env.HOME, '.Aiko Mail', fp)
      break
  }

  const Prefs = {
    data: {
      authenticated: false,
      token: '',
      email: '',
      password: '',
      firstTime: true
    },
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
      Object.keys(d).map(k => Prefs.data[k] = d[k])
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
  ipcMain.handle('clear preferences', _ => {
    /*
        q = {
            pref_key: value
        }
        */
    Prefs.data = {
      authenticated: false,
      token: '',
      email: '',
      password: '',
      firstTime: true
    }
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
