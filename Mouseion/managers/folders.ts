import type { PostOfficeProxy } from "@Mouseion/post-office/puppeteer"
import type { FolderMetadata } from "@Mouseion/post-office/types"
import type { Logger, LumberjackEmployer } from "@Mouseion/utils/logger"
import type Register from "@Mouseion/managers/register"
import autoBind from 'auto-bind'

type SpecialFolder =
  "inbox" |
  "sent" |
  "starred" |
  "spam" |
  "drafts" |
  "archive" |
  "trash"

const PREFIX = "[Aiko]"
const DONE_SLUG = "Done"
const TODO_SLUG = "To-Do"

export interface FolderState {
  names: string[]
  special: Record<SpecialFolder, string | null>
  tree: Record<string, FolderMetadata>
  boards: {
    names: string[]
    paths: Record<string, string>
  }
}

export default class Folders {

  private readonly Log: Logger
  private readonly courier: PostOfficeProxy
  private _state: FolderState = {
    names: [],
    special: {
      inbox: "INBOX",
      sent: null,
      starred: null,
      spam: null,
      drafts: null,
      archive: null,
      trash: null
    },
    tree: {},
    boards: {
      names: [],
      paths: {}
    }
  }

  get state(): FolderState {
    this.Log.warn("Reading folder state directly is not recommended.")
    return this._state
  }

  constructor(Registry: Register) {
    const Lumberjack = Registry.get('Lumberjack') as LumberjackEmployer
    this.Log = Lumberjack('Folders')

    this.courier = Registry.get('Courier') as PostOfficeProxy
    autoBind(this)
  }

  async sync(): Promise<FolderState> {
    this.Log.time("Synced folders.")

    const folderTree = await this.courier.folders.getFolders()

    const folderNames: Record<SpecialFolder, string | null> = {
      inbox: "INBOX",
      sent: null,
      starred: null,
      spam: null,
      drafts: null,
      archive: null,
      trash: null
    }

    const folders: string[] = []
    const folderData: Record<string, Pick<FolderMetadata, "flags">> = {}
    const walk = (folder: FolderMetadata) => {
      folders.push(folder.path)
      folderData[folder.path] = {
        flags: folder.flags
      }
      Object.values(folder?.children).map(walk)
    }
    Object.values(folderTree).map(walk)

    //? Finds a folder with a special flag if any exists
    const findFlag = (flag: string): string | null => {
      const candidates = folders.filter(folder => {
        const { flags } = folderData[folder]
        return flags.includes(flag)
      })
      return candidates?.[0]
    }

    //? Attempt to detect a folder using a keyword and info about its special qualities
    const detect = (keyword: string, {
      sent=false,
      starred=false,
      spam=false,
      drafts=false,
      archive=false,
      trash=false,
    } ={}) => {
      if (sent) {
        const candidate = findFlag('\\Sent')
        if (candidate) return candidate
      }
      if (starred) {
        const candidate = findFlag('\\Flagged')
        if (candidate) return candidate
      }
      if (spam) {
        const candidate = findFlag('\\Junk')
        if (candidate) return candidate
      }
      if (drafts) {
        const candidate = findFlag('\\Drafts')
        if (candidate) return candidate
      }
      if (archive) {
        const candidate = findFlag('\\All') || findFlag('\\Archive')
        if (candidate) return candidate
      }
      if (trash) {
        const candidate = findFlag('\\Trash')
        if (candidate) return candidate
      }

      const candidates = folders.filter(folder => folder.includes(keyword))
      return candidates?.[0]
    }

    folderNames.sent = detect("Sent", { sent: true })
    folderNames.starred = detect("Starred", { starred: true })
    folderNames.spam = detect("Spam", { spam: true }) || detect("Junk")
    folderNames.drafts = detect("Drafts", { drafts: true })
    folderNames.archive = detect("All Mail", { archive: true }) || detect("Archive")
    folderNames.trash = detect("Trash", { trash: true }) || detect("Deleted")

    const aiko_folder = folderTree[PREFIX]
    if (!aiko_folder) {
      await this.courier.folders.newFolder(PREFIX)
      return await this.sync()
    }

    const boardNames: string[] = []
    const boardPaths: Record<string, string> = {}
    const boards = Object.values(aiko_folder?.children || {}).map(({ path }) => {
      const slug = path.substr((PREFIX + '/').length)
      boardNames.push(slug)
      boardPaths[slug] = path
      return { slug, path }
    })

    if (!(boardNames.includes(DONE_SLUG))) {
      this.Log.warn("Done folder did not exist, creating it.")
      const slug = DONE_SLUG
      const path = PREFIX + '/' + slug
      await this.courier.folders.newFolder(path)
      boardNames.push(slug)
      boardPaths[slug] = path
      boards.push({ slug, path })
    }

    const user_boards = boardNames.filter(slug => slug != DONE_SLUG)
    if (user_boards.length == 0) {
      this.Log.warn("No user boards exist, creating To-Do automatically.")
      const slug = TODO_SLUG
      const path = PREFIX + '/' + slug
      await this.courier.folders.newFolder(path)
      boardNames.push(slug)
      boardPaths[slug] = path
      boards.push({ slug, path })
    }

    // TODO: what to do about local boards that no longer exist remotely?
    //! need to remove that folder in the DB as a location for any affected messages
    //! otherwise, we risk the thread folder being selected incorrectly
    this.Log.warn("There is currently no strategy for handling boards that no longer exist remotely.")

    this.Log.timeEnd("Synced folders.")
    this._state = {
      names: folders,
      special: folderNames,
      tree: folderTree,
      boards: {
        names: boardNames,
        paths: boardPaths
      },
    }
    return this._state
  }

  async add(path: string) {
    try {
      await this.courier.folders.newFolder(path)
      await this.sync()
      return true
    } catch (e) {
        this.Log.error(e)
        return false
    }
  }

  async remove(path: string) {
    try {
      await this.courier.folders.deleteFolder(path)
      await this.sync()
      return true
    } catch (e) {
      this.Log.error(e)
      return false
    }
  }

  name(name: SpecialFolder) {
    return this._state.special[name]
  }

  inbox() { return this.name("inbox") }
  sent() { return this.name("sent") }
  starred() { return this.name("starred") }
  spam() { return this.name("spam") }
  drafts() { return this.name("drafts") }
  archive() { return this.name("archive") }
  trash() { return this.name("trash") }
  all() {
    return this._state.names
  }
  boards() { return this._state.boards }
  boardPaths() { return Object.values(this._state.boards.paths) }

  readonly prefix = PREFIX
  readonly done = PREFIX + '/' + DONE_SLUG
  readonly todo = PREFIX + '/' + TODO_SLUG
  isBoard(path: string) { return path.startsWith(this.prefix) }

}