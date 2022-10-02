import path from 'path'
import fs2 from 'fs-extra'
import type SecureCommunications from '@Chiton/utils/comms'
import autoBind from 'auto-bind'
import type Register from '@Mouseion/managers/register'

interface Settings {

  version: number

  auth: {
    authenticated: boolean
    token: string
    credentials: {
      email: string
      password: string
    }
  }

  meta: {
    firstTime: boolean
  }

}
const isSettings = (x: any):x is Settings => !!(x.version > 0)

export default class DwarfStar {

  private readonly fp: string
  settings: Settings
  private comms: SecureCommunications

  constructor(Registry: Register, fp: string) {
    switch (process.platform) {
      case 'darwin': fp = path.join(process.env.HOME || "~", "Library", "Application Support", "Aiko Mail", fp); break
      case 'win32': fp = path.join(process.env.APPDATA || "/c/", "Aiko Mail", fp); break
      case 'linux': fp = path.join(process.env.HOME || "~", ".Aiko Mail", fp); break
    }
    this.fp = fp
    this.comms = Registry.get("Communications") as SecureCommunications

    this.settings = DwarfStar.defaultSettings

    this.comms.register("save preferences", this.set.bind(this))
    this.comms.register("clear preferences", this.reset.bind(this))
    this.comms.register("get preferences", this.copy.bind(this))

    autoBind(this)
  }

  reset(_: {}={}) {
    fs2.ensureFileSync(this.fp)
    const s = fs2.readFileSync(this.fp, {encoding: "utf-8"})
    if (!(s?.length > 0)) {
      this.settings = DwarfStar.defaultSettings
    }
    else {
      const d = JSON.parse(s)
      if (isSettings(d)) this.settings = d
    }
    return this.save()
  }

  private set(d: Partial<Settings>) {
    this.settings = {
      ...this.settings,
      ...d
    }
    return this.save()
  }

  private copy(_: {}={}) {
    return JSON.parse(JSON.stringify(this.settings))
  }

  save() {
    const s = JSON.stringify(this.settings)
    fs2.writeFileSync(this.fp, s)
    return this.settings
  }

  static get defaultSettings(): Settings {
    return {

      version: 1,

      auth: {
        authenticated: false,
        token: "",
        credentials: {
          email: "",
          password: ""
        }
      },
      meta: {
        firstTime: true
      }
    }
  }
}