module.exports = async (provider, courier, Log) => {
  const fetch = async () => {
    Log.log("Building folders")
    // Fetch remote folders
    const folders = await courier.folders.getFolders()

    const folderNames = {
      inbox: null,
      sent: null,
      starred: null,
      spam: null,
      drafts: null,
      archive: null,
      trash: null,
      all: folders,
      aiko: {}
    }

    //? Standard folders:

    //* Default folder names
    folderNames.inbox = 'INBOX'


    Log.warn("Defaulting to folder auto-detection.")
    const allfolders = []
    const allFolderInfo = {}
    const walk = folder => {
      allfolders.push(folder.path)
      allFolderInfo[folder.path] = {flags: folder.flags}
      Object.values(folder?.children).map(walk)
    }
    Object.values(folders).map(walk)

    const detectFolderName = (keyword, {
      sent=false, star=false, drafts=false, trash=false, spam=false, archive=true
    }={}) => {
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
        const candidate = findWithFlag('\\All')
        if (candidate) return candidate
      }

      const matches = allfolders.filter(f => f.includes(keyword))
      if (matches.length > 0) return matches[0]
      return ''
    }

    folderNames.sent = detectFolderName('Sent', {sent: true})
    folderNames.starred = detectFolderName('Star', {star: true})
    folderNames.spam = detectFolderName('Spam', {spam: true}) || detectFolderName('Junk', {spam: true})
    folderNames.drafts = detectFolderName('Drafts', {drafts: true})
    folderNames.archive = detectFolderName('All Mail', {archive: true}) || detectFolderName('Archive', {archive: true})
    folderNames.trash = detectFolderName('Trash', {trash: true}) || detectFolderName('Deleted', {trash: true})

    //? Aiko Mail folders:

    //* If there is no Aiko Mail folder on remote, create it
    const aikoFolder = folders['[Aiko]']
    if (!aikoFolder) await courier.folders.newFolder('[Aiko]')
    //* collect remote boards
    const boards = Object.values(aikoFolder?.children || {}).map(({ path }) => {
      const slug = path.substr('[Aiko]/'.length)
      folderNames.aiko[slug] = path
      return { slug, path }
    })
    Log.log("Collected remote board names")
    //* If there is no Done folder, create it
    if (!folderNames.aiko['Done']) {
      Log.warn("'Done' folder not exist, creating it")
      await courier.folders.newFolder('[Aiko]/Done')
      folderNames.aiko['Done'] = '[Aiko]/Done'
    }
    const user_boards = boards.filter(({slug}) => slug != 'Done')
    //* If there are no user boards, create a To-Do board
    if (user_boards.length == 0) {
      Log.warn("No user boards exist, creating To-Do automatically")
      await courier.folders.newFolder('[Aiko]/To-Do')
      folderNames.aiko['To-Do'] = '[Aiko]/To-Do'
      boards.push({slug: 'To-Do', path: '[Aiko]/To-Do'})
    }

    // TODO: what to do about local boards/folders that no longer exist remotely?
    Log.warn("There is currently no strategy for handling boards that no longer exist remotely.")

    return folderNames
  }

  let Folders = await fetch()

  const add = async path => {
    try {
      await courier.folders.newFolder(path)
      Folders = await fetch()
      return true
    } catch (e) {
      Log.error(e)
      return False
    }
  }

  const remove = async path => {
    try {
      await courier.folders.deleteFolder(path)
      Folders = await fetch()
      return true
    } catch (e) {
      Log.error(e)
      return False
    }
  }

  const get = () => Folders

  return {
    get, add, remove, fetch
  }
}