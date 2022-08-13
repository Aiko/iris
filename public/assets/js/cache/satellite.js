//? Storage for tiny properties that are local to the browser instance

const Satellite = (() => {
  const tinyStore = localforage.createInstance({
    name: 'ko-quick-access'
  })

  const keys = async () => {
    const keys = await tinyStore.keys()
    return keys.filter(key => key.startsWith('aiko-mail:'))
  }

  const makeKey = k => 'aiko-mail:' + k

  const store = async (k, obj) => {
    const key = makeKey(k)
    await tinyStore.setItem(key, obj)
  }

  const load = async k => {
    const key = makeKey(k)
    return await tinyStore.getItem(key)
  }

  const kill = tinyStore.clear
  const del = async k => {
    const key = makeKey(k)
    await tinyStore.removeItem(key)
  }

  //? Migration steps for older versions of Satellite
  migration = async () => {
    await app.reprocessThreads()
    const emailPrefix = app.imapConfig.email
    const k_old = s => emailPrefix + s
    await del(k_old("emails/inbox"))
    await del(k_old("emails/fullInbox"))
    await del(k_old("threads"))
  }

  //? Audit the size of keys in Satellite
  audit = async () => {
    const keys = await tinyStore.keys()
    const sizes = Object.fromEntries(await Promise.all(keys.map(async key => {
        key = key.replace("aiko-mail:", "")
        const data = await Satellite.load(key)
        const size = JSON.stringify(data).length.toFilesize()
        return [key, size]
    })))
    return sizes
  }

  return { store, load, kill, del, keys, tinyStore, version: 2, migration, audit }
})()
