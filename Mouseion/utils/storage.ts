import path from 'path'
import fs from 'fs'
import fs2 from 'fs-extra'
import autoBind from 'auto-bind'

/** A basic storage system mimicking localstorage, persisting within the filesystem */
class Storage {

  /*
  * Basic storage system that mimics localstorage by using keys that you can store, load, pop
  ! However, everything is stored in [JSON] files with hard disk space, be careful!

  * store(key: String, data: [JSON-serializable] object/string/etc) => void, writes the data to the key
  * load(key: String) => parsed object/string/etc, reads the data stored in key
  * pop(key: String) => parsed object/string/etc, reads the data stored in key and deletes key
  * append(key: String, data: string) => void, appends the data to the key, does not work when json=true
  */

  readonly dir: string //? the directory the storage works out of
  readonly json: boolean //? whether or not data is stored in JSON format

  constructor(dir: string, {json=true}: {json?: boolean} ={}) {
    this.dir = dir
    this.json = json
    autoBind(this)
  }

  //? Cleans a storage key by explicitly allowing only certain characters in the filename
  //! Known bug: if two different keys *clean* to the same key filepath, they will overlap
  private static clean_key = (key: string): string => key.replace(/[^A-z0-9/\-_]/g, '').substr(0, 69)

  //? Creates the correct filepath for a cleaned key, taking into account JSON settings
  private filepath = (key: string): string => `${this.dir}/${key}.${this.json ? 'json' : 'log'}`

  /** Stores data into the relevant file for a key, stringifying it if need be */
  store(key: string, data: any): void {
    key = Storage.clean_key(key)
    const fp: string = this.filepath(key)
    fs2.ensureFileSync(fp)
    fs.writeFileSync(fp, this.json ? JSON.stringify(data) : data)
  }
  cache = this.store.bind(this)

  /** Loads data for a relevant key, parsing it if need be */
  load(key: string): string | any {
    key = Storage.clean_key(key)
    const fp: string = this.filepath(key)
    fs2.ensureFileSync(fp)
    const s: string = fs.readFileSync(fp).toString()
    return !!s && (this.json ? JSON.parse(s) : s)
  }
  check = this.load.bind(this)

  /** Loads data for the relevant key, parsing it if need be, then clearing the key */
  pop(key: string): string | any {
    key = Storage.clean_key(key)
    const fp: string = this.filepath(key)
    fs2.ensureFileSync(fp)
    const s: string = fs.readFileSync(fp).toString()
    fs.unlinkSync(fp)
    return !!s && (this.json ? JSON.parse(s) : s)
  }

  /** Appends a string to a file if the directory is not JSON managed */
  append(key: string, data: string): void {
    if (this.json) throw new Error("Cannot append to a JSON-managed directory. Do a full read-write.");
    key = Storage.clean_key(key)
    const fp: string = this.filepath(key)
    fs2.ensureFileSync(fp)
    fs.appendFileSync(fp, data)
  }
}

export default Storage