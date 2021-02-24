module.exports = () => {
  const defs = {}

  const register = (key, def) => defs[key] = def
  const get = key => defs[key] || null
}