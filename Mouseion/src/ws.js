
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
    Usage: (until this is turned into a shim)

    get a tag:
        const tag = ipcStream.tag()

    send data:
        await ipcStream.send(tag, myData)

    Respond via normal IPC with {stream: tag}
*/

const SockPuppet = async () => {

  const resolvers = {}
  const Tag = () => {
    const id = crypto.randomBytes(32).toString('hex')
    if (resolvers[id]) return tag()
    resolvers[id] = true
    return id
  }

  const port = await unused_port()
  const wss = new WebSocket.Server({port})
  wss.on('connection', ws => {
    ws.on('message', m => {
      const { tag,  } = JSON.parse(m)

    })
  })

  return {
    port, send,
    Tag,
  }
}
ipcMain.handle('start websocket server', async (_, q) => {
  if (ipcStream.port) return ipcStream.port

  const port = await unused_port()
  ipcStream.port = port
  const wss = new WebSocket.Server({
    port
    // TODO: custom config for compression, etc
  })

  wss.on('connection', ws => {
    const outgoing = {}
    ws.on('message', m => {
      const { stream } = JSON.parse(m)
      if (outgoing[stream]) outgoing[stream]()
    })
    ipcStream.send = (tag, data) => new Promise((s, j) => {
      outgoing[tag] = s
      ws.send(JSON.stringify({ tag, data }))
    })
  })

  return port
})