//? Storage for larger files

const GasGiant = (() => {
  const makeKey = k => 'aiko-mail/' + k
  const decoder = new TextDecoder()

  const store = async (k, obj) => {
    const key = makeKey(k)
    const { success } = await app.executeIPC(
      app.ipcTask('save cache', {
        key,
        data: JSON.stringify(obj)
      })
    )
    if (!success) return null
    return true
  }

  const load = async k => {
    const key = makeKey(k)
    const { success, data } = await app.executeIPC(
      app.ipcTask('get cache', {
        key
      })
    )
    if (!success || !data) return null
    const jsonString = decoder.decode(data)
    if (!jsonString) return null
    else return JSON.parse(JSON.parse(jsonString))
  }

  const pop = async k => {
    const key = makeKey(k)
    const { success, data } = await app.executeIPC(
      app.ipcTask('pop cache', {
        key
      })
    )
    if (!success || !data) return null
    const jsonString = decoder.decode(data)
    if (!jsonString) return null
    else return JSON.parse(JSON.parse(jsonString))
  }

  const kill = async () => {
    const { success } = await app.callIPC(
      app.ipcTask('kill cache', {})
    )
    if (!success) return null
    return true
  }

  return { store, load, pop, kill }
})()
