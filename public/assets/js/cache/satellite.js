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

  return { store, load, kill, del, keys, tinyStore }
})()
