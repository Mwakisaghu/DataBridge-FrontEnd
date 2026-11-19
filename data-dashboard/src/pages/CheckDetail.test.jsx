import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderPage } from '../test/render'
import CheckDetail from './CheckDetail'
import store from '../redux/store'
import { setActor } from '../redux/sessionSlice'
import * as api from '../api/databridge'

vi.mock('../api/databridge')

const check = {
  id: 'c1', runId: 'r1', checkNo: 2, status: 'FAILED', rows: 100, critical: 2, warning: 1, info: 0, readiness: '0.9800',
  createdAt: '2026-11-19T08:00:00Z', createdBy: 'harry', datasetIds: ['d1'], error: null,
  sheets: [{ kind: 'STATIC', sheet: 'Members', tableId: 52185700, rows: 100, rowsWithCritical: 2, rowsWithWarning: 1, critical: 2, warning: 1, info: 0 }],
  skipped: [{ ruleId: 'bosa-loans.loan', reason: "Needs sheet 'Loans' in the same submission" }],
  counts: [{ severity: 'CRITICAL', status: 'OPEN', count: 1 }, { severity: 'CRITICAL', status: 'WAIVER_REQUESTED', count: 1 }],
}
const findings = {
  total: 2, offset: 0,
  items: [
    { id: 'f1', severity: 'CRITICAL', sheet: 'Members', rowNo: 8, columnRef: 'AK', field: 'P.I.N Number', message: 'P.I.N Number is not a KRA PIN',
      value: 'A1*********4Q', status: 'OPEN', autoFixable: false },
    { id: 'f2', severity: 'CRITICAL', sheet: 'Members', rowNo: 29, columnRef: 'AC', field: 'Gender', message: 'Gender is not an option',
      value: '*', status: 'WAIVER_REQUESTED', requestedBy: 'harry', waiverReason: 'Confirmed by HR', autoFixable: false },
  ],
}

const render = () => renderPage(<Routes><Route path="/checks/:id" element={<CheckDetail />} /></Routes>, { route: '/checks/c1' })

describe('Check page', () => {
  beforeEach(() => {
    vi.mocked(api.getCheck).mockResolvedValue(check)
    vi.mocked(api.getFindings).mockResolvedValue(findings)
    vi.mocked(api.requestWaiver).mockResolvedValue({})
    vi.mocked(api.decideWaiver).mockResolvedValue({})
  })

  it('shows readiness, open criticals, rules not checked and masked findings', async () => {
    store.dispatch(setActor('harry'))
    render()
    expect(await screen.findByText('A1*********4Q')).toBeInTheDocument()
    expect(screen.getByText('98%')).toBeInTheDocument()
    expect(screen.getByText('1 rule was not checked')).toBeInTheDocument()
    expect(screen.getByText('Awaiting another reviewer')).toBeInTheDocument()
  })

  it('requests a waiver with a reason', async () => {
    store.dispatch(setActor('harry'))
    render()
    await userEvent.click(await screen.findByRole('button', { name: 'Waive' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Why this can be accepted as it is'), 'Client confirmed in writing')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Request a waiver' }))
    await waitFor(() => expect(api.requestWaiver).toHaveBeenCalledWith('f1', 'Client confirmed in writing'))
  })

  it('lets a different user approve a waiver', async () => {
    store.dispatch(setActor('reviewer'))
    render()
    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve the waiver' }))
    await waitFor(() => expect(api.decideWaiver).toHaveBeenCalledWith('f2', true, undefined))
  })

  it('filters by severity on the server', async () => {
    render()
    await screen.findByText('A1*********4Q')
    await userEvent.click(screen.getByRole('combobox', { name: 'Severity' }))
    await userEvent.click(await screen.findByTitle('Warning'))
    await waitFor(() => expect(api.getFindings).toHaveBeenLastCalledWith('c1', expect.objectContaining({ severity: 'WARNING', offset: 0 })))
  })
})
