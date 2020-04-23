// storage for small things

const BigStorage = (() => {

    const makeKey = k => "aiko-mail/" + k

    const store = async (k, obj) => {
        const key = makeKey(k)
        const { success } = await app.callIPC(
            app.ipcTask('save cache', {
                key: k,
                data: obj
            })
        )
        if (!success) return null
    }

    const load = async k => {
        const key = makeKey(k)
        const { success, data } = await app.callIPC(
            app.ipcTask('get cache', {
                key: k
            })
        )
        if (!success || !data) return null
        else return data
    }

    return { store, load }
})()