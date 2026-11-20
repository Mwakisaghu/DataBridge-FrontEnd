import { ApiError, http } from './client'

// One function per server endpoint. Pages import from here, never from axios directly,
// so tests can replace this module.

const data = (p) => p.then((r) => r.data)
const enc = encodeURIComponent

export const health = () =>
  http.get('/health', { baseURL: '' }).then((r) => r.data)

// Setups
export const getSetup = () => data(http.get('/setup'))
export const patchSetup = (changes) => data(http.patch('/setup', changes))
export const getTemplateSetups = () => data(http.get('/setup/templates'))
export const getStoredSetups = () => data(http.get('/setup/export'))
export const putTemplateSetup = (sheet) => data(http.put(`/setup/templates/${enc(sheet.sheetName)}`, sheet))
export const deleteTemplateSetup = (sheetName) => data(http.delete(`/setup/templates/${enc(sheetName)}`))
export const importSetups = (bundle) => data(http.post('/setup/import', bundle))

// Clients, projects, runs
export const getOverview = () => data(http.get('/overview'))
export const createClient = (body) => data(http.post('/clients', body))
export const createProject = (clientId, body) => data(http.post(`/clients/${enc(clientId)}/projects`, body))
export const openRun = (projectId, body) => data(http.post(`/projects/${enc(projectId)}/runs`, body))
export const closeRun = (runId) => data(http.post(`/runs/${enc(runId)}/close`))

// Datasets
export const getDatasets = (runId) => data(http.get(`/runs/${enc(runId)}/datasets`))
export const getSchema = (datasetId) => data(http.get(`/datasets/${enc(datasetId)}/schema`))

/**
 * Sends the workbook as the raw request body; the server streams it straight into a
 * workspace. Resolves for both 201 (read) and 422 (recorded as ERROR): both carry the
 * dataset record. `ok` tells them apart.
 */
export function uploadDataset(runId, kind, file, onProgress) {
  return http
    .post(`/runs/${enc(runId)}/datasets`, file, {
      params: { kind, fileName: file.name },
      headers: { 'Content-Type': 'application/octet-stream' },
      validateStatus: (s) => s === 201 || s === 422,
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
    .then((r) => ({ ok: r.status === 201, ...r.data }))
}

// Retention and audit
export const purgeAll = () => data(http.post('/retention/purge', null, { params: { scope: 'all' } }))
export const getAudit = (params) => data(http.get('/audit', { params }))

// Submissions: a run's workbooks validated together (Phase 1)
export const openSubmission = (runId) => data(http.post(`/runs/${enc(runId)}/submissions`))
export const cancelSubmission = (id) => data(http.delete(`/submissions/${enc(id)}`))
export const processSubmission = (id) =>
  http.post(`/submissions/${enc(id)}/process`, null, { validateStatus: (s) => s === 201 || s === 422 }).then((r) => r.data)

/** Streams one workbook into a submission. Resolves for 201 (received) and 422 (recorded with its error). */
export function addSubmissionFile(id, kind, file, onProgress) {
  return http
    .post(`/submissions/${enc(id)}/files`, file, {
      params: { kind, fileName: file.name },
      headers: { 'Content-Type': 'application/octet-stream' },
      validateStatus: (s) => s === 201 || s === 422,
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
    .then((r) => r.data)
}

// Checks, findings, waivers
export const getChecks = (runId) => data(http.get(`/runs/${enc(runId)}/checks`))
export const getCheck = (id) => data(http.get(`/checks/${enc(id)}`))
export const getFindings = (id, params) => data(http.get(`/checks/${enc(id)}/findings`, { params }))
export const requestWaiver = (findingId, reason) => data(http.post(`/findings/${enc(findingId)}/waiver`, { reason }))
export const decideWaiver = (findingId, approve, note) =>
  data(http.post(`/findings/${enc(findingId)}/waiver/decision`, { approve, note }))

/** Downloads a file the server generates (such as the exception register) and saves it. */
/** A file response's name from Content-Disposition. */
function fileNameOf(r, fallback) {
  const cd = r.headers?.['content-disposition'] || ''
  return /filename="([^"]+)"/.exec(cd)?.[1] || fallback
}

/** Hands a blob to the browser as a download. */
export function saveBlob(blob, name) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/** A refused file request's body is JSON inside a blob: read the server's message out of it. */
function blobText(blob) {
  if (typeof blob.text === 'function') return blob.text()
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.readAsText(blob)
  })
}

async function blobError(e) {
  if (e instanceof ApiError && e.body instanceof Blob) {
    try {
      const msg = JSON.parse(await blobText(e.body))?.error
      if (msg) return new ApiError(msg, e.status, null)
    } catch {
      // not JSON: keep the generic message
    }
  }
  return e
}

export async function download(path, fallbackName) {
  try {
    const r = await http.get(path, { responseType: 'blob' })
    saveBlob(r.data, fileNameOf(r, fallbackName))
  } catch (e) {
    throw await blobError(e)
  }
}

// Cleaning (module 3)
/** Sends a workbook to be cleaned; resolves to the cleaned file and the id of its change log. */
export async function cleanWorkbook(runId, kind, file, onProgress) {
  try {
    const r = await http.post(`/runs/${enc(runId)}/clean`, file, {
      params: { kind, fileName: file.name },
      headers: { 'Content-Type': 'application/octet-stream' },
      responseType: 'blob',
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
    return { blob: r.data, fileName: fileNameOf(r, `${file.name} (cleaned).xlsx`), jobId: r.headers?.['x-databridge-cleaning-job'] }
  } catch (e) {
    throw await blobError(e)
  }
}
export const getCleaningJobs = (runId) => data(http.get(`/runs/${enc(runId)}/cleaning-jobs`))
export const getCleaningJob = (id) => data(http.get(`/cleaning-jobs/${enc(id)}`))
export const getCleaningRules = () => data(http.get('/setup/cleaning'))
export const putCleaningRule = (rule) => data(http.put(`/setup/cleaning/${enc(rule.id)}`, rule))
export const deleteCleaningRule = (id) => data(http.delete(`/setup/cleaning/${enc(id)}`))
export const downloadRegister = (checkId) => download(`/checks/${enc(checkId)}/register.xlsx`, 'exception-register.xlsx')

// Rule Setup
export const getRules = () => data(http.get('/setup/rules'))
export const putRule = (rule) => data(http.put(`/setup/rules/${enc(rule.id)}`, rule))
export const deleteRule = (id) => data(http.delete(`/setup/rules/${enc(id)}`))

// Sign-in and users
export const me = () => data(http.get('/auth/me'))
export const login = (username, password) => data(http.post('/auth/login', { username, password }))
export const logout = () => data(http.post('/auth/logout'))
export const changePassword = (currentPassword, newPassword) =>
  data(http.post('/auth/password', { currentPassword, newPassword }))
export const getUsers = () => data(http.get('/users'))
export const createUser = (body) => data(http.post('/users', body))
export const updateUser = (id, body) => data(http.put(`/users/${enc(id)}`, body))
export const resetUserPassword = (id) => data(http.post(`/users/${enc(id)}/reset-password`))

// Reconciliation (module 4)
export const getReconciliation = (checkId) => data(http.get(`/checks/${enc(checkId)}/reconciliation`))
export const downloadReconPack = (checkId) => download(`/checks/${enc(checkId)}/reconciliation.xlsx`, 'reconciliation-pack.xlsx')
export const getReconSetup = () => data(http.get('/setup/reconciliation'))
export const putControl = (c) => data(http.put(`/setup/reconciliation/controls/${enc(c.id)}`, c))
export const deleteControl = (id) => data(http.delete(`/setup/reconciliation/controls/${enc(id)}`))
export const putTrialBalance = (tb) => data(http.put('/setup/reconciliation/trial-balance', tb))
export const resetTrialBalance = () => data(http.delete('/setup/reconciliation/trial-balance'))
