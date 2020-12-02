module.exports = async (xs, batch_size, cb, cb2=() => null) => {
  let promises = []
  const results = []
  let i = 0
  for (const x of xs) {
    if (promises.length >= batch_size) {
      //* consume batch
      results.push(...(await Promise.all(promises)))
      promises = []
      i++
      console.log("Processed", i*batch_size, "of", xs?.length)
      await cb2()
    }
    promises.push(cb(x))
  }
  //* consume remaining
  results.push(...(await Promise.all(promises)))
  return results
}