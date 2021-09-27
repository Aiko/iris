//? Storage for preferences/settings

const DwarfStar = (() => {

  // TODO: need this sync to be more automatic. typescript would work wonders here
  let settings = {
    version: 1,
    auth: {
      authenticated: false,
      token: "",
      credentials: {
        email: "",
        password: ""
      }
    },
    meta: {
      firstTime: true
    }
  }

  const save = async (newSettings) => {
    settings = {...settings, ...newSettings}
    const remoteSettings = await app.executeIPC(
      app.ipcTask("save preferences", settings)
    )
    if (!(remoteSettings?.version)) return null
    if (remoteSettings?.version > settings.version) throw "Version mismatch. Needs fix."
    else settings = remoteSettings
    return success
  }

  const sync = async () => {
    const remoteSettings = await app.executeIPC(
      app.ipcTask("get preferences", settings)
    )
    if (!(remoteSettings?.version)) return null
    if (remoteSettings?.version > settings.version) throw "Version mismatch. Needs fix."
    else settings = remoteSettings
    return success
  }

  const reset = async () => {
    const remoteSettings = await app.executeIPC(
      app.ipcTask("clear preferences", settings)
    )
    if (!(remoteSettings?.version)) return null
    if (remoteSettings?.version > settings.version) throw "Version mismatch. Needs fix."
    else settings = remoteSettings
    return success
  }

  return { save, sync, reset, settings: () => {
    console.log("Returning settings:", settings)
    return settings
  }}
})()
