const { ipcRenderer } = require('electron')

const IPCMiddleware = (errorHandler => {
    const checkError = (e, msg) => {
        if (e) {
            errorHandler(e)
            throw msg
        }
    }

    const secret = String.random(32)

    const maybeToken = ipcRenderer.invoke('key exchange', secret)
    let token;
    if (KJUR.jws.JWS.verify(maybeToken, secret)) {
        token = jwt_decode(maybeToken)?.token
    } else checkError(maybeToken, "Key exchange token was invalid.")
    if (!token) throw "Key exchange failed 🤷‍♂️";

    const encode = d => {
        // 😋
        d.token = token
        return d
    }

    const decode = ({s, error}) => {
        checkError(error, "Main process returned error.")
        if (KJUR.jws.JWS.verify(s, secret)) {
            const { success, payload } = jwt_decode(s)
            if (!success) checkError(payload, "Main process did not return success.")
            return payload
        } else checkError(s, "JWT token was not valid.")
    }

    return {encode, decode}
})

const ipc = {
    data: {
        TAG: ["%c[IPC]", "background-color: #ff99ff; color: #000;"],
        middleware: null,
    },
    methods: {
        // TODO: call init on IPC when loading the app
        async init() {
            this.middleware = Middleware(this.handleIPCError)
        },
        async handleIPCError(e) {
            error(...TAG, e)
        }
    }
}