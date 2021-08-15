import 'colors'

export default class Register {
  private defs: Record<string, any> = {}

  register(key: string, def: any): void { this.defs[key] = def }
  clear() { this.defs = {} }
  get = (key: string): any =>
    this.defs[key] || console.error(`Attempted to load ${key} module, but it has not been registered.`.red) ;;
}