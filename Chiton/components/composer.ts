import type SecureCommunications from '@Chiton/utils/comms'
import WindowManager from '@Chiton/utils/window-manager'
import type Register from '@Mouseion/managers/register'
import autoBind from 'auto-bind'
import { dialog } from 'electron'
import type { Logger, LumberjackEmployer } from '@Mouseion/utils/logger'
import writeGood from "write-good"
import fs from 'fs-extra'
import mime from 'mime'

export default class Composer {
  private readonly comms: SecureCommunications
  private readonly Log: Logger

  constructor(
    private readonly Registry: Register,
  ) {
    this.comms = Registry.get("Communications") as SecureCommunications
    const Lumberjack = Registry.get("Lumberjack") as LumberjackEmployer
    this.Log = Lumberjack("Composer")

    this.comms.register("please open the composer", this.open.bind(this))
    this.comms.register("please attach a file", this.getAttachment.bind(this))
    this.comms.register("please check my writing", this.getSuggestions.bind(this))

    autoBind(this)
  }

  private open({bang}: {bang: string}) {
    const win = WindowManager.newWindow({
      height: 600, width: 800
    }, {spellcheck: true})

    const windowManager = new WindowManager(this.Registry, win, 'composer-' + bang)
    windowManager.window = win

    windowManager.loadURL(`file://${__dirname}/../../../public/compose.html#${bang}`)

    win.show()
    win.focus()

    return {bang,}
  }

  private async getAttachment() {
    const downloadFolder = (() => {
      switch(process.platform) {
        case "win32": return `${process.env.USERPROFILE}\\Downloads`
        case "darwin": return `${process.env.HOME}/Downloads`
        default: return `${process.env.HOME}/Downloads`
      }
    })()

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Attach a file",
      defaultPath: `${downloadFolder}/`,
      filters: [ //? copilot wrote this so... I hope it works? lol
        { name: "All Files", extensions: ["*"] },
        { name: "PDF", extensions: ["pdf"] },
        { name: "Word", extensions: ["doc", "docx"] },
        { name: "Excel", extensions: ["xls", "xlsx"] },
        { name: "PowerPoint", extensions: ["ppt", "pptx"] },
        { name: "Text", extensions: ["txt"] },
        { name: "Image", extensions: ["jpg", "jpeg", "png", "gif"] },
        { name: "Audio", extensions: ["mp3", "wav", "aac"] },
        { name: "Video", extensions: ["mp4", "avi", "mkv"] }
      ]
    })

    if (canceled || !filePaths) {
      this.Log.warn("User cancelled attachment download/no filePath returned.")
      return []
    }

    //? Get the filesize and content type of each file
    const files = await Promise.all(filePaths.map(async filePath => {
      const { size, contentType } = await fs.promises.stat(filePath).then(stats => {
        return {
          size: stats.size,
          // @ts-ignore
          contentType: mime.getType(filePath)
        }
      })
      return {
        size, contentType, filePath
      }
    }))

    this.Log.shout("Attaching:", filePaths)
    return files
  }

  private async getSuggestions({text, opts}: { text: string, opts?: writeGood.Options }) {
    const suggestions = writeGood(text, opts)
    return suggestions
  }

}