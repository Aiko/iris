import Storage from '../../Mouseion/utils/storage'
import { session } from 'electron'
import SecureCommunications from '../utils/comms'
import path from 'path'
import fs2 from 'fs-extra'

export default class BigBoiCache {
  private readonly storage: Storage
  private readonly dir: string

  constructor(
    dir: string
  ) {
    switch (process.platform) {
      case 'darwin': dir = path.join(process.env.HOME || "~", "Library", "Application Support", "Aiko Mail", dir); break
      case 'win32': dir = path.join(process.env.APPDATA || "/c/", "Aiko Mail", dir); break
      case 'linux': dir = path.join(process.env.HOME || "~", ".Aiko Mail", dir); break
    }
    this.dir = dir

    this.storage = new Storage(dir, {json: true})

    SecureCommunications.registerBasic("save cache", this.save)
    SecureCommunications.registerBasic("get cache", this.load)
    SecureCommunications.registerBasic("pop cache", this.pop)
    SecureCommunications.registerBasic("kill cache", this.kill)
    SecureCommunications.registerBasic("clear all cache", this.clear)
  }

  private save({key, data}: {key: string, data: any}) {
    try {
      this.storage.store(key, data)
      return { success: true }
    } catch (e) {
      return { error: e }
    }
  }

  private load({key}: {key: string}) {
    try {
      const data = this.storage.load(key)
      return { success: true, data }
    } catch (e) {
      return { error: e }
    }
  }

  private pop({key}: {key: string}) {
    try {
      const data = this.storage.pop(key)
      return { success: true, data }
    } catch (e) {
      return { error: e }
    }
  }

  private kill(opts: {}) {
    fs2.removeSync(this.dir)
    return { success: true }
  }

  private async clear(opts: {}) {
    await session.defaultSession.clearCache()
    return { success: true }
  }

}