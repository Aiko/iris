import net from 'net'
const DEFAULT_PORT = 41600

export const unused_port = async (start_port=DEFAULT_PORT): Promise<number> => {
  const look_for_port = (port: number): Promise<number> => new Promise((s, _) => {
    const serv = net.createServer()
    serv.listen(port, () => {
      serv.once('close', () => s(port))
      serv.close()
    })
    serv.on('error', _ => {
      look_for_port(port + 1).then(p => s(p))
    })
  })

  return await look_for_port(start_port)
}

export const RESERVED_PORTS = {
	VEIL: 4160,
	COMMS: {
		EXPRESS: 41599, //! HARD-CODED INTO REDIRECT-URI, DO NOT CHANGE
		WS: 4161,
	},

}