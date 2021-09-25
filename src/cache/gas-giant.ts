import Storage from '../../Mouseion/utils/storage'
import { session } from 'electron'
import SecureCommunications from '../utils/comms'
import path from 'path'
import fs2 from 'fs-extra'
import autoBind from 'auto-bind'
import Register from '../../Mouseion/managers/register'

export default class GasGiant {
  private readonly storage: Storage
  private readonly dir: string

  constructor(
    Registry: Register,
    dir: string
  ) {
    switch (process.platform) {
      case 'darwin': dir = path.join(process.env.HOME || "~", "Library", "Application Support", "Aiko Mail", dir); break
      case 'win32': dir = path.join(process.env.APPDATA || "/c/", "Aiko Mail", dir); break
      case 'linux': dir = path.join(process.env.HOME || "~", ".Aiko Mail", dir); break
    }
    this.dir = dir

    this.storage = new Storage(dir, {json: true})

    const comms = Registry.get("Communications") as SecureCommunications
    comms.register("save cache", this.save.bind(this))
    comms.register("get cache", this.load.bind(this))
    comms.register("pop cache", this.pop.bind(this))
    comms.register("kill cache", this.kill.bind(this))
    comms.register("clear all cache", this.clear.bind(this))

    autoBind(this)
  }

  private async save({key, data}: {key: string, data: any}) {
    try {
      await this.storage.store(key, data)
      return { success: true }
    } catch (e) {
      return { error: e }
    }
  }

  private async load({key}: {key: string}) {
    try {
      const data = await this.storage.load(key)
      return { success: true, data }
    } catch (e) {
      return { error: e }
    }
  }

  private async pop({key}: {key: string}) {
    try {
      const data = await this.storage.pop(key)
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