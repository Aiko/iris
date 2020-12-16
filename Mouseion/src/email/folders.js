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

    //* Provider specific folder names
    if (provider == 'google') {
      Log.log("Using Google strategy for folder selection.")
      // FIXME: should check if these actually exist and if not default to auto-detection
      folderNames.sent = '[Gmail]/Sent Mail'
      folderNames.starred = '[Gmail]/Starred'
      folderNames.spam = '[Gmail]/Spam'
      folderNames.drafts = '[Gmail]/Drafts'
      folderNames.archive = '[Gmail]/All Mail'
      folderNames.trash = '[Gmail]/Trash'
    }

    //* Folder name detection
    else {
      Log.warn("No strategy defined for this provider, will default to auto-detection.")
      const allfolders = []
      const walk = folder => {
        allfolders.push(folder.path)
        allfolders.push(...Object.values(folder?.children).map(({ path }) => path ))
      }
      Object.values(folders).map(walk)

      const detectFolderName = keyword => {
        const matches = allfolders.filter(f => f.includes(keyword))
        if (matches.length > 0) return matches[0]
        return ''
      }

      folderNames.sent = detectFolderName('Sent')
      folderNames.starred = detectFolderName('Star')
      folderNames.spam = detectFolderName('Spam') || detectFolderName('Junk')
      folderNames.drafts = detectFolderName('Drafts')
      folderNames.archive = detectFolderName('All Mail') || detectFolderName('Archive')
      folderNames.trash = detectFolderName('Trash') || detectFolderName('Deleted')
    }

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
    get, add, remove
  }
}