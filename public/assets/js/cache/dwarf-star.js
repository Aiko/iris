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

  const save = () => {
    const { success, payload } = await app.executeIPC(
      app.ipcTask("save preferences", settings)
    )
    if (!success || !payload) return null
    const remoteSettings = payload
    if (remoteSettings?.version > settings.version) throw "Version mismatch. Needs fix."
    else settings = remoteSettings
    return success
  }

  const sync = () => {
    const { success, payload } = await app.executeIPC(
      app.ipcTask("get preferences", {})
    )
    if (!success || !payload) return null
    const remoteSettings = payload
    if (remoteSettings?.version > settings.version) throw "Version mismatch. Needs fix."
    else settings = remoteSettings
    return success
  }

  const reset = () => {
    const { success, payload } = await app.executeIPC(
      app.ipcTask("clear preferences", {})
    )
    if (!success || !payload) return null
    const remoteSettings = payload
    if (remoteSettings?.version > settings.version) throw "Version mismatch. Needs fix."
    else settings = remoteSettings
    return success
  }

  return { save, sync, reset, settings }
})()
