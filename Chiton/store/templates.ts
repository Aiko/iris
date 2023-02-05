import Storage from '@Iris/common/storage'
import { session } from 'electron'
import type SecureCommunications from '@Chiton/utils/comms'
import path from 'path'
import fs2 from 'fs-extra'
import autoBind from 'auto-bind'
import type Register from '@Iris/common/register'
import SockPuppet from '@Marionette/ws/sockpuppet'
const HTML2Text = require('html-to-text')

export interface Template {
  html: string
}

export interface TemplateEntry {
  title: string
  created: Date
  uses: number
  id: string
  preview: string
}

//! FIXME: this should use a DB model
// TODO: this should connect to Arachne to sync templates across devices

export default class CookieCutter extends SockPuppet {
	puppetry: { [key: string]: SockPuppetry | ((...args: any[]) => any) }
	protected checkInitialize(): boolean {
		throw new Error('Method not implemented.')
	}
	protected initialize(args: any[], success: (payload: object) => void): Promise<void> {
		throw new Error('Method not implemented.')
	}


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

  async add({entry, content}: {entry: Omit<TemplateEntry, "preview">, content: Template}): Promise<boolean> {
    const id = entry.id
    const exists = await this.storage.load(id).catch(_ => _)
    if (exists) return false
    const templates = await this.list()
    templates.push({
      ...entry,
      preview: HTML2Text.fromString(content.html ?? '', {
        wordwrap: false,
        hideLinkHrefIfSameAsText: true,
        ignoreImage: true,
        unorderedListItemPrefix: ' - '
      }).substr(0, 200)
    })
    await this.storage.store("catalog", templates)
    await this.storage.store(id, content)
    return true
  }

  async remove({id,}: {id: string}): Promise<boolean> {
    const template = await this.storage.pop(id).catch(_ => _)
    return !!template
  }
}