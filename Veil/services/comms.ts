import "@aiko/dwarfhaven";
import assert from "assert";
import { ipcRenderer } from "electron/renderer";
import Logger from "@Veil/services/roots"
import type { Maybe } from "@Veil/utils/common";

interface ChitonPayload<T> {
  s: string
  error?: string
  payload?: T
  stream?: string
}

type VeilPayload<T> = T & {
  token: string
}

class IPC {

  private static readonly secret = String.random(32);
  private static readonly Log: Logger = new Logger("IPC", {
    bgColor: "##f98dc1", fgColor: "#000000"
  })
  private readonly Log: Logger = IPC.Log

  private constructor(
    private readonly token: string
  ) {}

  public static async seed(): Promise<Maybe<IPC>> {
    const maybeToken = await ipcRenderer.invoke("key exchange", { secret: this.secret })
    const { secret, token } = window.decodeJWT(maybeToken)
    if (secret !== this.secret) {
      this.Log.error("Key exchange failed 🤷‍♂️")
      return null
    }
    return new this(token)
  }

  encode<T>(d: T): VeilPayload<T> {
    const encoded: VeilPayload<T> = {
      ...d,
      token: this.token
    }
    return encoded
  }

  decode<T>({
    s, error, payload, stream
  }: ChitonPayload<NonNullable<T>>): Maybe<T> {
    if (error) {
      this.Log.error("Main process returned error:", error)
      return null
    }

    if (payload) return payload
    if (stream) return null // TODO: support streams

    const d = window.decodeJWT(s) as {
      success: boolean,
      payload: T
    }

  }

}
export {}

  const decode = ({ s, error, payload, stream }) => {
    checkError(error, 'Main process returned error.')
    if (payload) return payload
    if (stream) return ipcStream.get(stream)
    const d = jwt_decode(s)
    const { success } = d
    if (KJUR.jws.JWS.verifyJWT(s, secret.hexEncode(), { alg: ['HS256'] })) {
      if (!success) checkError(d.payload, 'Main process did not return success.')
      if (!d.payload) info(...MAILAPI_TAG, 'IPC payload is empty!')
      return d.payload
    } else checkError(s, 'JWT token was not valid.')
  }

  return { encode, decode }
}

const IPCStream = async () => {
  /*
    Usage: (until this is turned into a shim)

    ipc response has "stream" property
    this is the string identifier of ws objects,
    i.e. {stream: "foo"}

    when this ipcstream middleware receives a payload,
    it will be named, i.e.
    { tag: "foo", data: bar}

    this will be inserted into mailbox below as
    mailbox["foo"] = bar

    then you can ask this ipcStream for the "foo" key
    i.e. ipcStream.get(response.stream)

    be careful that you are sure it has been received!
    */
  const mailbox = {}

  // now for the websocket stuff
  // first, start the websocket server
  const port = await ipcRenderer.invoke('get websocket port', {})
  // then, connect to it
  const socket = new WebSocket('ws://localhost:' + port)
  socket.binaryType = 'arraybuffer'
  socket.onmessage = m => {
    const { tag, data } = JSON.parse(m.data)
    mailbox[tag] = data
    socket.send(JSON.stringify({ stream: tag }))
  }

  // it's like a queue so it deletes the tag after
  // you .get it, you can .peek to prevent deletion
  // or .clear to manually clear without a get/peek
  // operation (which could save you a cpu cycle or two, lol)

  const peek = tag => mailbox[tag]
  const clear = tag => delete mailbox[tag]

  return {
    peek,
    clear,
    get: tag => {
      const d = peek(tag)
      clear(tag)
      return d
    },
    // FIXME: remove tags in prod
    // NOTE: don't use tags in your code!
    // we shouldn't expose this for security reaasons!
    tags: () => Object.keys(mailbox)
  }
}

const IPC_TAG = ['%c[IPC]', 'background-color: #0; color: #000;']

const ipc = {
  data: {
    ipcStream: null,
    middleware: null,
    ipcQueue: [],
    ipcRotating: false,
    ipcProcessed: 0
  },
  methods: {
    // TODO: call init on IPC when loading the app
    async initIPC () {
      this.ipcStream = await IPCStream()
      this.middleware = await IPCMiddleware(this.handleIPCError, this.ipcStream)
    },
    async initIPCNoStream () {
      info(...IPC_TAG, 'There will be no IPC streaming.')
      this.middleware = await IPCMiddleware(this.handleIPCError, null)
    },
    async handleIPCError (e) {
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
    ipcTask (channel, data) {
      return {
        channel,
        q: this.middleware.encode(data)
      }
    },
    async executeIPC (...tasks) {
      //* WARNING: this is immediate don't use this unless you have to
      const results = []
      try {
        for ({ channel, q } of tasks) {
          const res = await ipcRenderer.invoke(channel, q)
          results.push(this.middleware.decode(res))
        }
        if (results.length == 1) return results[0]
        else return results
      } catch (error) {
        window.error(error, new Error("encountered on channel: " + channel))
        return { error }
      }
    },
    callIPC (...tasks) {
      if (tasks.length == 0) throw 'Calling IPC with no tasks'
      return new Promise((s, _) => {
        this.ipcQueue.push({ tasks, s })
        if (!this.ipcRotating) this.ipcRotate()
      })
    },
    async ipcRotate () {
      this.ipcRotating = true
      if (this.ipcRotating) {
        if (this.ipcQueue.length > 0) {
          const { tasks, s } = this.ipcQueue.shift()
          const results = []
          try {
            for ({ channel, q } of tasks) {
              const res = await ipcRenderer.invoke(channel, q)
              results.push(this.middleware.decode(res))
            }
            if (results.length == 1) s(results[0])
            else s(results)
          } catch (error) {
            window.error(error, new Error("encountered on channel: " + channel))
            s({ error })
          }
          this.ipcProcessed += 1
          this.ipcRotate()
        } else {
          this.ipcRotating = false
        }
      }
    }
  }
}

let ipcCounter = 0

// if ipc is stuck more 2s then rotate it
window.setInterval(() => {
  if (app.ipcProcessed == ipcCounter) app.ipcRotate()
  ipcCounter = app.ipcProcessed
}, 2000)