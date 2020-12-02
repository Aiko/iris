// Method must be falsy in failure
const Barusu = (method, max_tries=3) => async (...args) => {
  let tries = 0
  let result
  while (tries < max_tries) {
    result = method(...args)
    tries++;
    if (result) break;
  }
  return result;
}

module.exports = Barusu