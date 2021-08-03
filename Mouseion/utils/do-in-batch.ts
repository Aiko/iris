const do_in_batch = async function <A, B>(
  elements: A[], batch_size: number,
  consumer: (_: A) => Promise<B>, monitor: () => void | Promise<void> = ()=>{},
  verbose: boolean = false
): Promise<B[]> {
  let promises: Promise<B>[] = []
  const results: B[] = []

  let i = 0
  for (const element of elements) {

    //? consume batch if we have reached the maximum size
    if (promises.length >= batch_size) {
      results.push(...(await Promise.all(promises)))
      promises = []
      i++
      if (verbose) console.log("Processed", i*batch_size, "of", elements.length)
      await monitor()
    }
    promises.push(consumer(element))
  }

  //? consume any remainders
  results.push(...(await Promise.all(promises)))
  if (verbose) console.log("Processed", elements.length)
  return results
}

// Promise.batch = do_in_batch
export default do_in_batch