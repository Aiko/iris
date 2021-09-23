import path from 'path'
import fs from 'fs'
import fs2 from 'fs-extra'
import autoBind from 'auto-bind'
import { performance } from 'perf_hooks'
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
  async store(key: string, data: any): Promise<void> {
    key = Storage.clean_key(key)
    const fp: string = this.filepath(key)
    fs2.ensureFileSync(fp)
    await fs.promises.writeFile(fp, this.json ? JSON.stringify(data) : data)
  }
  cache = this.store.bind(this)

  /** Loads data for a relevant key, parsing it if need be */
  async load(key: string): Promise<string | any> {
    const t0 = performance.now()
    key = Storage.clean_key(key)
    const fp: string = this.filepath(key)
    fs2.ensureFileSync(fp)
    const s: string = (await fs.promises.readFile(fp)).toString()
    const t1 = performance.now()
    const res = !!s && (this.json ? JSON.parse(s) : s)
    const t2 = performance.now()
    console.log('----------------------')
    console.log("CHECK", key, "READ:", t1 - t0)
    console.log("CHECK", key, "PARSE:", t2 - t1)
    console.log('----------------------')
  }
  check = this.load.bind(this)

  /** Loads data for the relevant key, parsing it if need be, then clearing the key */
  async pop(key: string): Promise<string | any> {
    key = Storage.clean_key(key)
    const fp: string = this.filepath(key)
    fs2.ensureFileSync(fp)
    const s: string = (await fs.promises.readFile(fp)).toString()
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