import Janitor from "@Mouseion/utils/cleaner"
import type { Logger, LumberjackEmployer } from "@Mouseion/utils/logger"
import type Folders from "@Mouseion/managers/folders"
import type Register from "@Mouseion/managers/register"
import autoBind from 'auto-bind'

export default class Custodian {
  readonly Log: Logger
  private Cleaners: Record<string, Janitor> = {}
  private folders: Folders

  constructor(private Registry: Register) {
    const Lumberjack = this.Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Custodian')
    this.folders = this.Registry.get('Folders') as Folders
    autoBind(this)
  }

  async hire(folder: string): Promise<Janitor> {
    const janitor = new Janitor(this.Registry, {
      folder, useAiko: (
        folder == this.folders.inbox() || this.folders.isBoard(folder)
      )
    })
    this.Cleaners[folder] = janitor
    return janitor
  }

  async get(folder: string): Promise<Janitor> {
    return (
      this.Cleaners[folder] ||
      (await this.hire(folder))
    )
  }

}