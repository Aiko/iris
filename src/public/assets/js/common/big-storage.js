// storage for small things

const BigStorage = (() => {
    const bigStore = localforage.createInstance({
        name: "ko-big-boi"
    });

    const makeKey = k => "aiko-mail:" + k

    const store = async (k, obj) => {
        const key = makeKey(k)
        await bigStore.setItem(key, obj)
    }

    const load = async k => {
        const key = makeKey(k)
        return await bigStore.getItem(key)
    }

    return { store, load }
})()