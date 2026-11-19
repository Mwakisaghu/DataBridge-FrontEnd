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

/** Template kind from a file name, the way consultants name the templates.  */
export function kindFromName(name) {
  const n = name.toLowerCase()
  if (n.includes('transaction')) return 'TRANSACTIONAL'
  if (/(^|[^a-z])hr([^a-z]|$)/.test(n)) return 'HR'
  if (n.includes('static')) return 'STATIC'
  return 'OTHER'
}

/** What a rule checks, in a sentence. */
export function describeRule(r) {
  switch (r.type) {
    case 'REFERENCE': return `${r.field} must exist in ${r.targetSheet} (${r.targetField})`
    case 'FORMAT': return `${r.field} must match ${r.pattern}`
    case 'UNIQUE': return `${r.field} is unique`
    case 'REQUIRED': return `${r.field} is required`
    case 'SUM_EQUALS': return `${r.field} totals ${r.expected} per ${r.groupBy}`
    case 'COMPARE': return `${r.field} ${r.operator} ${r.otherField}`
    default: return r.field
  }
}

