type Subsequence = {
  start: number,
  end: number
}

/** Returns valid IMAP sequence notation from a list of UIDs.
 * @param {number} leeway - max size of non-contiguous UID subsequences
 */
export default (raw_uids: (string | number)[], leeway=20): string => {
  if (!raw_uids?.length) return ''
  const uids:number[] = raw_uids.map((uid: string | number):number => +uid).sort((a, b) => a - b)

  const subsequences: Subsequence[] = []
  const subsequence: Subsequence = {
    start: uids[0],
    end: uids[0]
  }

  for (const uid of uids) {
    if (uid >= subsequence.end && uid - subsequence.end <= 20)
      subsequence.end = uid
    else {
      const { start, end } = subsequence
      subsequences.push({ start, end })
      subsequence.start = uid
      subsequence.end = uid
    }
  }
  subsequences.push(subsequence)

  const sequence: string[] = []

  subsequences.forEach(({ start, end }) => {
    if (start == end) sequence.push('' + start)
    else sequence.push(start + ':' + end)
  })

  return sequence.join(',')
}