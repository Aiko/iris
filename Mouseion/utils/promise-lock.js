const crypto = require('crypto')

const Lock = (() => {
  let _lock = {
    holder: null,
    lock: (async () => null)()
  }

  //? generate a unique ID
  //? puts it into waiting if the lock is owned
  //? otherwise, own the lock
  const waiting = []
  const ID = () => {
    const id = crypto.randomBytes(12).toString('hex')
    if (waiting.includes(id)) return ID()
    if (_lock.holder) waiting.push(id)
    else _lock.holder = id
    return id
  }

  return {
    //? use this everywhere you want to use a shared resource
    //? it'll wait for anything currently holding it before grabbing the lock
    acquire: async cb => {
      const id = ID()
      while (_lock.holder != id) await _lock.lock;
      _lock.lock = new Promise(async (s, _) => {
        //? perform our task
        await cb()
        //? then, get a new holder
        if (waiting.length > 0) _lock.holder = waiting.shift()
        //? if nothing is waiting just empty the lock
        else _lock.holder = null
        //? release the lock
        s()
      })
      await _lock.lock;
    },
    peek: () => _lock.holder,
    length: () => waiting.length
  }
})

module.exports = Lock