import { RESERVED_PORTS } from "@Iris/common/port";
import { Singleton, Multiton, type Maybe } from "@Iris/common/types";
import SockPuppet from "@Marionette/ws/sockpuppet";
import autoBind from "auto-bind";
//? For reserved ports use the definition from @Iris/common/ports.ts

export default class Guidepost extends SockPuppet {

  puppetry = {
    get: {
      singleton: this.getSingleton,
      multiton: this.getMultiton,
    },
    set: {
      register: this.register,
      add: this.add,
      remove: this.remove,
    }
  }

  private SINGLETONS: Record<Singleton, Maybe<number>> = {
    [Singleton.INBOX]: null,
    [Singleton.CALENDAR]: null,
    [Singleton.GOAUTH]: null,
    [Singleton.MSOAUTH]: null,
    [Singleton.SETTINGS]: null,
    [Singleton.TEMPLATES]: null,
  }
  private MULTITONS: Record<Multiton, {[hash: string]: Maybe<number>}> = {
    [Multiton.COMPOSER]: {},
  }

  protected checkInitialize(): boolean { return true }
  protected initialize = async (args: any[], success: (payload: object) => void) => success({})

  constructor() {
    super("Guidepost", {
      renderer: false
    }, RESERVED_PORTS.GUIDEPOST)

    autoBind(this)
  }

  public register(service: Singleton, port: number): void {
    if (this.SINGLETONS[service] !== null)
      return this.Log.warn(`${service} is already registered and will not be overwritten.`)
    this.SINGLETONS[service] = port
  }
  public getSingleton(service: Singleton): number {
    const port = this.SINGLETONS[service]
    if (!port) throw new Error(`${service} is not registered.`)
    return port
  }

  public add(service: Multiton, hash: string, port: number): void {
    if (this.MULTITONS[service][hash] !== null)
      return this.Log.warn(`${service}:${hash} is already registered and will not be overwritten.`)
    this.MULTITONS[service][hash] = port
  }
  public remove(service: Multiton, hash: string): void {
    if (this.MULTITONS[service][hash] === null)
      return this.Log.warn(`${service}:${hash} is not registered and cannot be removed.`)
    this.MULTITONS[service][hash] = null
  }
  public getMultiton(service: Multiton, hash: string): number {
    const port = this.MULTITONS[service][hash]
    if (!port) throw new Error(`${service}:${hash} is not registered.`)
    return port
  }


}
