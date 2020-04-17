// NOTE: this mixin should be loaded first before anything else!!

const { ipcRenderer, remote } = require('electron')
window.ipcRenderer = ipcRenderer
window.remote = remote

const IPCMiddleware = (async errorHandler => {
    const checkError = (e, msg) => {
        if (e) {
            errorHandler(e)
            throw msg
        }
    }

    const secret = String.random(32)
    const maybeToken = await ipcRenderer.invoke('key exchange', {secret,})
    let token;
    if (KJUR.jws.JWS.verifyJWT(maybeToken, secret.hexEncode(), {alg: ['HS256']})) {
        token = jwt_decode(maybeToken)?.token
    } else checkError(maybeToken, "Key exchange token was invalid.")
    if (!token) throw "Key exchange failed 🤷‍♂️";

    const encode = d => {
        // 😋
        d.token = token
        return d
    }

    const decode = ({ s, error }) => {
        checkError(error, "Main process returned error.")
        checkError(!s, "Did not receive anything back.")
        if (KJUR.jws.JWS.verifyJWT(s, secret.hexEncode(), {alg: ['HS256']})) {
            const { success, payload } = jwt_decode(s)
            if (!success) checkError(payload, "Main process did not return success.")
            return payload
        } else checkError(s, "JWT token was not valid.")
    }

    return {encode, decode}
})

const IPC_TAG = ["%c[IPC]", "background-color: #ff99ff; color: #000;"]

const ipc = {
    data: {
        middleware: null,
        ipcQueue: [],
        ipcRotating: false
    },
    methods: {
        // TODO: call init on IPC when loading the app
        async initIPC() {
            this.middleware = await IPCMiddleware(this.handleIPCError)
        },
        async handleIPCError(e) {
            error(...(IPC_TAG), e)
        },
        /*

        USAGE EXAMPLE:

        For single tasks:
        const {message} = await this.callIPC(
            this.ipcTask('please echo', {message: "foo"})
        )

        For batch tasks:
        const results = await this.callIPC(
            this.ipcTask('please echo', {message: "hello"}),
            this.ipcTask('please echo', {message: "world"})
        )
        console.log(results[0].message) // "hello"
        console.log(results[1].message) // "world"

        */
        ipcTask(channel, data) {
            return {
                channel,
                q: this.middleware.encode(data)
            }
        },
        callIPC(...tasks) {
            if (tasks.length == 0) throw "Calling IPC with no tasks"
            return new Promise((s, _) => {
                this.ipcQueue.push({ tasks, s })
                if (!this.ipcRotating) this.ipcRotate()
            })
        },
        async ipcRotate() {
            this.ipcRotating = true
            if (this.ipcQueue.length > 0) {
                const { tasks, s } = this.ipcQueue.shift()
                const results = []
                try {
                    for ({channel, q} of tasks)
                    results.push(
                        this.middleware.decode(
                            await ipcRenderer.invoke(channel, q)
                        )
                    )
                    if (results.length == 1) s(results[0])
                    else s(results)
                } catch (error) {
                    s({error,})
                }
                this.ipcRotate()
            } else {
                this.ipcRotating = false
            }
        }
    }
}