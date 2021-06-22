module.exports = async Registry => {

  //? Retrieve the necessary modules from the Registry
  const Courier = Registry.get('Courier')
  const Lumberjack = Registry.get('Lumberjack')

  //? Initialize a Log
  const Log = Lumberjack('Folder Manager')

  //? Sync folders between remote and local
  const sync = async () => {
    Log.time("Synced folders.")

    //? Fetch remote folders
    const folders = await Courier.folders.getFolders()

    //? Keep track of our folder structure
    const folderNames = {
      inbox: "INBOX",
      sent: null,
      starred: null,
      spam: null,
      drafts: null,
      archive: null,
      trash: null,
      all: folders,
      aiko: {}
    }

    //? Restructure remote folder data
    Log.warn("Defaulting to folder auto-detection.")
    const allfolders = []
    const allFolderInfo = {}
    const walk = folder => {
      allfolders.push(folder.path)
      allFolderInfo[folder.path] = {flags: folder.flags}
      Object.values(folder?.children).map(walk)
    }
    Object.values(folders).map(walk)

    //? Attempts to detect a folder using a keyword and maybe some special flags
    const detectFolderName = (keyword, {
      sent=false, star=false, drafts=false, trash=false, spam=false, archive=true
    }={}) => {
      //? Finds a folder with a special flag if any exists
      const findWithFlag = flag => {
        const candidate = allfolders.filter(folder => {
          const { flags } = allFolderInfo[folder]
          return flags.includes(flag)
        })?.[0]
        if (candidate) return candidate
        return null
      }
      if (sent) {
        const candidate = findWithFlag('\\Sent')
        if (candidate) return candidate
      }
      if (star) {
        const candidate = findWithFlag('\\Flagged')
        if (candidate) return candidate
      }
      if (drafts) {
        const candidate = findWithFlag('\\Drafts')
        if (candidate) return candidate
      }
      if (trash) {
        const candidate = findWithFlag('\\Trash')
        if (candidate) return candidate
      }
      if (spam) {
        const candidate = findWithFlag('\\Junk')
        if (candidate) return candidate
      }
      if (archive) {
        const candidate = findWithFlag('\\All') || findWithFlag('\\Archive')
        if (candidate) return candidate
      }

      const matches = allfolders.filter(f => f.includes(keyword))
      if (matches.length > 0) return matches[0]
      return ''
    }

    //? Fill in the rest of our special folders
    folderNames.sent = detectFolderName('Sent', {sent: true})
    folderNames.starred = detectFolderName('Star', {star: true})
    folderNames.spam = detectFolderName('Spam', {spam: true}) || detectFolderName('Junk', {spam: true})
    folderNames.drafts = detectFolderName('Drafts', {drafts: true})
    folderNames.archive = detectFolderName('All Mail', {archive: true}) || detectFolderName('Archive', {archive: true})
    folderNames.trash = detectFolderName('Trash', {trash: true}) || detectFolderName('Deleted', {trash: true})

    //? If there is no Aiko Mail folder on remote, create it and try again
    const aikoFolder = folders['[Aiko]']
    if (!aikoFolder) {
      await Courier.folders.newFolder('[Aiko]')
      return await sync()
    }

    //? Identify which boards exist on the remote
    const boards = Object.values(aikoFolder?.children || {}).map(({ path }) => {
      const slug = path.substr('[Aiko]/'.length)
      folderNames.aiko[slug] = path
      return { slug, path }
    })

    //? If there is no Done folder, create it, because it is a specially named mandatory folder.
    if (!folderNames.aiko['Done']) {
      Log.warn("'Done' folder not exist, creating it")
      await Courier.folders.newFolder('[Aiko]/Done')
      folderNames.aiko['Done'] = '[Aiko]/Done'
      boards.push({slug: 'Done', path: '[Aiko]/Done'})
    }

    //? Identify which user-defined boards exist on the remote
    const user_boards = boards.filter(({slug}) => slug != 'Done')

    //? If there are no user boards, create a To-Do board at minimum.
    if (user_boards.length == 0) {
      Log.warn("No user boards exist, creating To-Do automatically")
      await Courier.folders.newFolder('[Aiko]/To-Do')
      folderNames.aiko['To-Do'] = '[Aiko]/To-Do'
      boards.push({slug: 'To-Do', path: '[Aiko]/To-Do'})
    }

    // TODO: what to do about local boards/folders that no longer exist remotely?
    //* maybe need to remove all messages in that from that (otherwise their aikoFolder will be wrong)
    Log.warn("There is currently no strategy for handling boards that no longer exist remotely.")

    Log.timeEnd("Synced folders.")
    return folderNames
  }

  let Folders = await sync()

  //? Add a new folder
  const add = async path => {
    try {
      await Courier.folders.newFolder(path)
      Folders = await sync()
      return true
    } catch (e) {
      Log.error(e)
      return False
    }
  }

  //? Remove a folder
  const remove = async path => {
    try {
      await Courier.folders.deleteFolder(path)
      Folders = await fetch()
      return true
    } catch (e) {
      Log.error(e)
      return False
    }
  }

  const get = () => Folders

  return {
    get, add, remove, sync
  }
}