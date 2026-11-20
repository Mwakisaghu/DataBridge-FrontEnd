import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '../test/render'
import Reports from './Reports'
import Certificate from './Certificate'
import store from '../redux/store'
import { signedIn } from '../redux/sessionSlice'
import * as api from '../api/databridge'

vi.mock('../api/databridge')

const overview = [{
  client: { id: 'c1', code: 'SAMPLE', name: 'Sample SACCO' },
  projects: [{ project: { id: 'p1', code: 'BC', name: 'Go-live' }, runs: [{ run: { id: 'r1', runNo: 1, type: 'CUTOVER', cutoffDate: '2026-10-31', state: 'OPEN' } }] }],
}]
const items = (passed) => [
  { id: 'validated', label: 'Workbooks validated', passed: true, detail: 'Check 2: no open Critical finding (48 waived)' },
  { id: 'reconciled', label: 'Opening balances reconciled', passed: true, detail: '10 tie' },
  { id: 'packaged', label: 'Import package built from the latest check', passed: true, detail: '2 package(s)' },
  { id: 'imported', label: 'Every packaged table imported', passed, detail: passed ? '24 table(s) imported' : '3 of 24 not imported' },
]
const summary = (over) => ({
  client: overview[0].client, project: overview[0].projects[0].project, run: overview[0].projects[0].runs[0].run,
  latestCheck: { readiness: 0.9871 }, trend: [{ checkNo: 1, readiness: 0.6, critical: 69 }, { checkNo: 2, readiness: 0.9871, critical: 48 }],
  findings: { openCritical: 0, awaitingCritical: 0, waivedCritical: 48, openWarning: 2, waivedTotal: 48 },
  reconciliation: { lines: 10, ties: 10, variances: 0, notChecked: 0, unapproved: 0 },
  cleaning: { jobs: 3, cells: 27, rowsEmptied: 1 }, packages: 2, imports: { tables: 24, done: 24, pending: 0, problems: 0 },
  checklist: items(true), ready: true, signOff: null, ...over,
})
const as = (username, roles) => store.dispatch(signedIn({ user: { username, displayName: username, roles }, authMode: 'local' }))

describe('reports and sign-off', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    api.getOverview.mockResolvedValue(overview)
  })

  it('shows the checklist and keeps sign-off closed until every item passes', async () => {
    as('cora', ['CONSULTANT'])
    api.getRunSummary.mockResolvedValue(summary({ checklist: items(false), ready: false }))
    renderPage(<Reports />, { route: '/reports?run=r1' })
    expect(await screen.findByText('3 of 24 not imported')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Passed')).toHaveLength(3)
    expect(screen.getByLabelText('Not yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request sign-off' })).toBeDisabled()
  })

  it('says reconciliation has not run when every line was not checked', async () => {
    as('cora', ['CONSULTANT'])
    api.getRunSummary.mockResolvedValue(summary({ reconciliation: { lines: 10, ties: 0, variances: 0, notChecked: 10, unapproved: 0 } }))
    renderPage(<Reports />, { route: '/reports?run=r1' })
    expect(await screen.findByText('Not run')).toBeInTheDocument()
  })

  it('a consultant requests sign-off when ready', async () => {
    as('cora', ['CONSULTANT'])
    api.getRunSummary.mockResolvedValue(summary())
    api.requestSignOff.mockResolvedValue({})
    renderPage(<Reports />, { route: '/reports?run=r1' })
    await userEvent.click(await screen.findByRole('button', { name: 'Request sign-off' }))
    await userEvent.type(screen.getByLabelText('Note'), 'Cutover complete')
    await userEvent.click(screen.getAllByRole('button', { name: 'Request sign-off' }).at(-1))
    expect(api.requestSignOff).toHaveBeenCalledWith('r1', 'Cutover complete')
  })

  it('Finance approves, never the requester', async () => {
    const requested = { status: 'REQUESTED', requestedBy: 'fiona', requestedAt: '2026-11-20T05:00:00Z' }
    as('fiona', ['FINANCE'])
    api.getRunSummary.mockResolvedValue(summary({ signOff: requested }))
    const first = renderPage(<Reports />, { route: '/reports?run=r1' })
    expect(await screen.findByText('Waiting for Finance; never the requester.')).toBeInTheDocument()
    first.unmount()

    api.getRunSummary.mockResolvedValue(summary({ signOff: { ...requested, requestedBy: 'cora' } }))
    api.decideSignOff.mockResolvedValue({})
    renderPage(<Reports />, { route: '/reports?run=r1' })
    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }))
    await userEvent.click(screen.getByRole('button', { name: 'Approve sign-off' }))
    expect(api.decideSignOff).toHaveBeenCalledWith('r1', true, null)
  })

  it('prints a certificate only for a signed-off run', async () => {
    api.getRunSummary.mockResolvedValue(summary({ signOff: { status: 'APPROVED', certificateNo: 'DB-SAMPLE-BC-R1-20261120',
      requestedBy: 'cora', requestedAt: '2026-11-20T05:00:00Z', decidedBy: 'fiona', decidedAt: '2026-11-20T06:00:00Z' } }))
    const ok = renderPage(<Certificate />, { route: '/reports/certificate?run=r1' })
    expect(await screen.findByText('Data migration certificate')).toBeInTheDocument()
    expect(screen.getByText('DB-SAMPLE-BC-R1-20261120')).toBeInTheDocument()
    expect(screen.getByText('fiona')).toBeInTheDocument()
    ok.unmount()

    api.getRunSummary.mockResolvedValue(summary())
    renderPage(<Certificate />, { route: '/reports/certificate?run=r1' })
    expect(await screen.findByText('No certificate yet')).toBeInTheDocument()
  })
})
