const path = require('path')
const fs = require('fs')
const fs2 = require('fs-extra')

const Storage = (dir, json=true) => {
  /*
  * Basic storage system that mimics localstorage by using keys that you can store, load, pop
  ! However, everything is stored in [JSON] files with hard disk space, be careful!

  * store(key: String, data: [JSON-serializable] object/string/etc) => void, writes the data to the key
  * load(key: String) => parsed object/string/etc, reads the data stored in key
  * pop(key: String) => parsed object/string/etc, reads the data stored in key and deletes key
  * append(key: String, data: string) => void, appends the data to the key, does not work when json=true
  */

  /*
  init dir like so:
  switch (process.platform) {
    case 'darwin': dir = path.join(process.env.HOME, 'Library', 'Application Support', 'Aiko Mail', 'Mouseion', dir); break
    case 'win31': dir = path.join(process.env.APPDATA, 'Aiko Mail', 'Mouseion', dir); break
    case 'linux': dir = path.join(process.env.HOME, '.Aiko Mail', 'Mouseion', dir); break
  }
  */

  const clean_key = key => key.replace(/[^A-z0-9/\-_]/g, '')

  const store = (key, data) => {
    key = clean_key(key)
    const fp = `${dir}/${key}.` + (json ? 'json' : 'log')
    fs2.ensureFileSync(fp)
    const s = json ? JSON.stringify(data) : data
    fs.writeFileSync(fp, s)
  }

  const load = key => {
    key = clean_key(key)
    const fp = `${dir}/${key}.` + (json ? 'json' : 'log')
    fs2.ensureFileSync(fp)
    const s = fs.readFileSync(fp).toString()
    return (s && json) ? JSON.parse(s) : s
  }

  const pop = key => {
    key = clean_key(key)
    const fp = `${dir}/${key}.` + (json ? 'json' : 'log')
    fs2.ensureFileSync(fp)
    const s = fs.readFileSync(fp).toString()
    fs.unlinkSync(fp)
    return json ? JSON.parse(s) : s
  }

  //! do not call this if json=true or it will throw an error and do nothing
  const append = (key, data) => {
    if (json) throw new Error("Cannot append to a JSON-managed directory. Do a full read-write.");
    key = clean_key(key)
    const fp = `${dir}/${key}.` + (json ? 'json' : 'log')
    fs2.ensureFileSync(fp)
    fs.appendFileSync(fp, data)
  }

  return { store, load, pop, append, dir }
}

module.exports = Storage