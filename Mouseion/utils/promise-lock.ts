import crypto from 'crypto'
import autoBind from 'auto-bind'

export default class Lock {
  private readonly _lock: {
    holder: string,
    lock: Promise<void>
  } = {
    holder: "",
    lock: (async () => {})()
  }

  private readonly waiting: string[] = []

  constructor() { autoBind(this) }

  private ID(): string {
    const id = crypto.randomBytes(12).toString('hex')
    if (this.waiting.includes(id)) return this.ID()
    if (this._lock.holder) this.waiting.push(id)
    else this._lock.holder = id
    return id
  }

  async lock(cb: () => Promise<void>) {
    this._lock.lock = new Promise(async (s, _) => {
      await cb()
      if (this.waiting.length > 0) this._lock.holder = this.waiting.shift() || ""
      else this._lock.holder = ""
      s()
    })
  }

  async acquire(cb: () => Promise<void>) {
    const id = this.ID()
    if (this._lock.holder !== id) {
      await new Promise(async s => {
        let fin = false
        setTimeout(() => {
          if (!fin) {
            console.log("PROMISE LOCK TIMED OUT")
            s(true)
          }
        }, 30 * 1000)
        while (this._lock.holder != id) {
          await this._lock.lock;
          fin = true
          s(true)
        }
      })
    }
    this.lock(cb)
    await this._lock.lock;
  }

  peek() {
    return this._lock.holder
  }

  length() {
    return this.waiting.length
  }

}