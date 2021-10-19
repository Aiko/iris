import Storage from '../../Mouseion/utils/storage'
import { session } from 'electron'
import SecureCommunications from '../utils/comms'
import path from 'path'
import fs2 from 'fs-extra'
import autoBind from 'auto-bind'
import Register from '../../Mouseion/managers/register'

export interface Template {
  html: string
}

export interface TemplateEntry {
  title: string
  created: Date
  uses: number
  id: string
}

//! FIXME: this should save to drafts

export default class CookieCutter {
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
    comms.register("list templates", this.list.bind(this))
    comms.register("get template", this.load.bind(this))
    comms.register("delete template", this.remove.bind(this))
    comms.register("add template", this.add.bind(this))

    autoBind(this)
  }

  async list(): Promise<TemplateEntry[]> {
    const templates = await this.storage.load("catalog").catch(_ => _)
    if (!templates) {
      await this.storage.store("catalog", [])
      return []
    }
    return templates
  }

  async load({id,}:{id: string}): Promise<Template | null> {
    const template = await this.storage.load(id).catch(_ => _)
    if (!template) return null
    return template
  }

  async add({entry, content}: {entry: TemplateEntry, content: Template}): Promise<boolean> {
    const id = entry.id
    const exists = await this.storage.load(id).catch(_ => _)
    if (exists) return false
    const templates = await this.list()
    templates.push(entry)
    await this.storage.store("catalog", templates)
    await this.storage.store(id, content)
    return true
  }

  async remove({id,}: {id: string}): Promise<boolean> {
    const template = await this.storage.pop(id).catch(_ => _)
    return !!template
  }
}