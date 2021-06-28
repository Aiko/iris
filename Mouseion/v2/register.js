require('colors')

module.exports = () => {
  const defs = {}

  const register = (key, def) => defs[key] = def ;;
  const get = key => defs[key] || console.error(`Attempted to load ${key} module, but it has not been registered.`.red) ;;
}