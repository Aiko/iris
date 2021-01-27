//* return valid IMAP UID sequence from list of UIDs
module.exports = uids => {
  if (!uids?.length) return ''
  uids = uids.map(uid => eval(uid)).sort()
  const subsequences = []
  const subsequence = {
    start: uids[0],
    end: uids[0]
  }
  for (let i = 0; i < uids.length; i++) {
    const uid = uids[i]
    if (uid - subsequence.start <= 1) {
      subsequence.end = uid
    } else {
      const { start, end } = subsequence
      subsequences.push({ start, end })
      subsequence.start = uid
      subsequence.end = uid
    }
  }
  subsequences.push(subsequence)
  const sequence = []
  subsequences.map(({start, end}) => {
    if (start == end) sequence.push(`${start}`)
    else sequence.push(`${start}:${end}`)
  })
  return sequence.join(',')
}