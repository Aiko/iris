import crypto from 'crypto'

export default class Lock {
  private readonly _lock: {
    holder: string,
    lock: Promise<void>
  } = {
    holder: "",
    lock: (async () => {})()
  }

  private readonly waiting: string[] = []

  private ID(): string {
    const id = crypto.randomBytes(12).toString('hex')
    if (this.waiting.includes(id)) return ID()
    if (this._lock.holder) this.waiting.push(id)
    else this._lock.holder = id
    return id
  }

  async acquire(cb: () => Promise<void>) {
    const id = this.ID()
    while (this._lock.holder != id) await this._lock.lock;
    this._lock.lock = new Promise(async (s, _) => {
      await cb()
      if (this.waiting.length > 0) this._lock.holder = this.waiting.shift() || ""
      else this._lock.holder = ""
      s()
    })
    await this._lock.lock;
  }

  peek() {
    return this._lock.holder
  }

  length() {
    return this.waiting.length
  }

}