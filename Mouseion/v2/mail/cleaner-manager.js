const Janitor = require('../../utils/cleaner')

module.exports = async Registry => {

  const Lumberjack = Registry.get('Lumberjack')
  const FolderManager = Registry.get('FolderManager')

  const Cleaners = {}

  const get = async folder => {
    const cleaner = Cleaners[folder]
    if (!cleaner) {
      Cleaners[folder] = await Janitor(Lumberjack, folder, useAiko=(
        folder == FolderManager.get().inbox || folder.startsWith("[Aiko]")
      ))
      return get(folder)
    }
    return cleaner
  }

  return { get, create: Janitor }
}