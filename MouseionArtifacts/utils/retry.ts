/** Method must be falsy in nature. */
export default (method: (...args: any[]) => any, max_tries=3) => async (...args: any[]) => {
  for (let tries = max_tries - 1; tries >= 0; tries--) {
    const result = method(...args)
    if (result || tries == 0) return result
  }
}