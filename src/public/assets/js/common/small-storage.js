// storage for small things

const SmallStorage = (() => {

    const makeKey = k => "aiko-mail:" + k

    const store = (k, obj) => {
        const key = makeKey(k)
        localStorage.setItem(key, JSON.stringify(obj))
    }

    const load = k => {
        const key = makeKey(k)
        return localStorage.getItem(key)
    }

    return { store, load }
})()