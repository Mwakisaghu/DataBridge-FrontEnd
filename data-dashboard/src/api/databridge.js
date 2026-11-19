import { http } from './client'

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
