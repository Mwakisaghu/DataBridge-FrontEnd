// Display helpers. Dates show in the user's local time; the server stores UTC.

export function when(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function day(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function bytes(n) {
  if (n == null) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** First and last six characters: enough to compare two hashes by eye. */
export function shortHash(h) {
  return h && h.length > 14 ? `${h.slice(0, 6)}…${h.slice(-6)}` : h || ''
}

export const kindLabel = { STATIC: 'Static', TRANSACTIONAL: 'Transactional', HR: 'HR', OTHER: 'Other' }
export const runLabel = (run) => `${run.type === 'CUTOVER' ? 'Cutover' : 'Mock'} run ${run.runNo}`
