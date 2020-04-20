// storage for small things

const SmallStorage = (() => {
    const smallStore = localforage.createInstance({
        name: "ko-quick-access",
        driver: localforage.WEBSQL
    });

    const makeKey = k => "aiko-mail:" + k

    const store = async (k, obj) => {
        const key = makeKey(k)
        await smallStore.setItem(key, obj)
    }

    const load = async k => {
        const key = makeKey(k)
        return await smallStore.getItem(key)
    }

    return { store, load }
})()