
const DEFUALT_PORT = 41605

const unused_port = async () => {
  const look_for_port = p => new Promise((s, _) => {
    const port = DEFUALT_PORT

    const serv = net.createServer()
    serv.listen(port, _ => {
      serv.once('close', () => s(port))
      serv.close()
    })
    serv.on('error', _ => look_for_port(port + 1))
  })

  return await look_for_port(DEFUALT_PORT)
}

/*
Target should be something with method bindings and should be fully immutable
*/
const SockPuppet = async Target => {
  const stratify = (obj, prefix = '') =>
    Object.keys(obj).reduce((res, el) => {
      if (Array.isArray(obj[el])) return res

      if (typeof obj[el] === 'object' && obj[el] !== null )
        return {...res, ...stratify(obj[el], prefix + el + '.')}

      const key = prefix + el
      const tmp = {}
      tmp[key] = obj[el]
      return {...res, ...tmp}
    }, []);
  const API = stratify(Target)

  const port = await unused_port()
  const wss = new WebSocket.Server({port})

  wss.on('connection', ws => {
    const sksucc = id => payload => ws.send(JSON.stringify({
      success: true,
      payload, id
    }))
    const skerr = id => msg => ws.send(JSON.stringify({
      error: msg + '\n' + (new Error),
      id
    }))

    ws.on('message', async m => {
      /*
      * m should be 'please ' + JSON stringified message
      * object should have the following structure:
      * {
      *   id: String, // some random string to make ws easier
      *   action: String,
      *   args: [...] // must ALWAYS be set. for no args just do []
      * }
      */

      try {
        // TODO: eventually some security or so here beyond `please`...
        const { id, action, args } = JSON.parse(m.substr('please '.length))

        const success = sksucc(id)
        const error = skerr(id)

        const attempt = async method => {
          try {
            const result = await method(...args)
            return success(result)
          } catch (e) {
            return error(e)
          }
        }

        const method = API[action]
        if (!method) return error('You fucked up cunty!')

        return await attempt(method)
      } catch (e) {
        return ws.send(JSON.stringify({
          error: e + '\n' + (new Error)
        }))
      }
    })
  })
}

module.exports = SockPuppet