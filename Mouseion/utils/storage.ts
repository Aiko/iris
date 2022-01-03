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
  readonly raw: boolean //? whether to treat file input as raw Buffers and filepaths as absolute

  constructor(dir: string, {json=true, raw=false}: {json?: boolean, raw?: boolean} ={}) {
    this.dir = dir
    this.json = json
    this.raw = raw
    autoBind(this)
  }

  // read a file in one single read
  static async readFile(filename: string) {
    const handle = await fs.promises.open(filename, "r").catch(_ => _)
    if (!handle) return null
    if (handle instanceof Error) {
      return null
    }
    let buffer: Buffer | null = null
    try {
        const stats = await handle.stat()
        buffer = Buffer.allocUnsafe(stats.size)
        const { bytesRead } = await handle.read(buffer, 0, stats.size, 0)
        if (bytesRead !== stats.size) {
            throw new Error("bytesRead not full file size")
        }
    } finally {
      handle.close()
    }
    return buffer
  }

  //? Cleans a storage key by explicitly allowing only certain characters in the filename
  //! Known bug: if two different keys *clean* to the same key filepath, they will overlap
  private static clean_key = (key: string): string => key.replace(/[^A-z0-9/\-_]/g, '').substr(0, 86)

  //? Creates the correct filepath for a cleaned key, taking into account JSON settings
  private filepath = (key: string): string => `${this.dir}/${key}.${this.json ? 'json' : 'log'}`

  /** Stores data into the relevant file for a key, stringifying it if need be */
  async store(key: string, data: any): Promise<void> {
    if (!this.raw) key = Storage.clean_key(key)
    const fp: string = (this.raw) ? `${this.dir}/${key}` : this.filepath(key)
    await fs2.ensureFile(fp)
    await fs.promises.writeFile(fp, this.json ? JSON.stringify(data) : (
      this.raw ? Buffer.from(data) : data
    ))
  }
  cache = this.store.bind(this)

  async has_key(key: string): Promise<boolean> {
    if (!this.raw) key = Storage.clean_key(key)
    const fp: string = (this.raw) ? `${this.dir}/${key}` : this.filepath(key)
    return fs.promises.access(fp).then(_ => true).catch(_ => false)
  }

  /** Loads data for a relevant key, parsing it if need be */
  async load(key: string): Promise<string | any> {
    if (!this.raw) key = Storage.clean_key(key)
    const fp: string = (this.raw) ? `${this.dir}/${key}` : this.filepath(key)
    if (this.raw) {
      console.error(`Raw files are not supported for loading in this version of Mouseion.`)
      return null
    } else {
      const buffer = await Storage.readFile(fp)
      if (!buffer) return null
      const s: string = buffer.toString()
      try {
        return !!s && (this.json ? JSON.parse(s) : s)
      } catch (e) {
        console.error(`Couldn't parse JSON from ${this.dir}/${key}`)
        return null
      }
    }
  }
  check = this.load.bind(this)

  /** Loads data for the relevant key, parsing it if need be, then clearing the key */
  async pop(key: string): Promise<string | any> {
    key = Storage.clean_key(key)
    const fp: string = this.filepath(key)
    const buffer = await Storage.readFile(fp)
    if (!buffer) return null
    const s: string = buffer.toString()
    fs.unlinkSync(fp)
    try {
      return !!s && (this.json ? JSON.parse(s) : s)
    } catch (e) {
      console.error(`Couldn't parse JSON from ${this.dir}/${key}`)
      return null
    }
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