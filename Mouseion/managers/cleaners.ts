import Janitor from "../utils/cleaner"
import { Logger, LumberjackEmployer } from "../utils/logger"
import Folders from "./folders"
import Register from "./register"

export default class Custodian {
  readonly Log: Logger
  private Cleaners: Record<string, Janitor> = {}
  private folders: Folders

  constructor(private Registry: Register) {
    const Lumberjack = this.Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Custodian')
    this.folders = this.Registry.get('Folders') as Folders
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