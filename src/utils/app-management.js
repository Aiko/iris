const os = require('os')
const { app, autoUpdater } = require("electron")

module.exports = (Lumberjack, CHANNEL="Stable") => {

  const Log = Lumberjack("App Management")

  //? Check to make sure we are not in midst of the Squirrel installation
  if (require('electron-squirrel-startup')) {
    Log.error("App is being installed. Quitting to prevent unintended side effects.")
    app.quit()
    process.exit(0)
  }

  Log.log("Enabling automatic updates.")
  autoUpdater.on("error", Log.error)
  autoUpdater.on("checking-for-update", () => Log.log("Checking for updates..."))
  autoUpdater.on("update-not-available", () => Log.success("App is up to date."))
  autoUpdater.on("update-downloaded", () => Log.success("Downloaded update. Pending installation."))
  const platform = os.platform()
  const version = app.getVersion()
  const updateFeed =
    `https://knidos.helloaiko.com/update/${CHANNEL}/${platform}/${version}`;
  Log.log("Fetches updates from", updateFeed)
  autoUpdater.setFeedURL({
    url: updateFeed
  })
  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    // TODO: replace w/ modal
    dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Update', 'Later'],
      defaultId: 0,
      message: `An update to Aiko Mail is available. Updates contain important security updates, vital bug fixes and new features.`,
      title: 'Update Available'
    }, response => {
      if (response === 0) {
        autoUpdater.quitAndInstall()
      } else console.log(response)
    })
  })

  let interval = null

  const checkForUpdates = () => {
    autoUpdater.checkForUpdates()
    if (!interval) interval = setInterval(autoUpdater.checkForUpdates, 5 * 60 * 1000)
  }

  return {
    checkForUpdates
  }
}