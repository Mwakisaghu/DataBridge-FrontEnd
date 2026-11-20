import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '../test/render'
import ReconciliationPanel from './ReconciliationPanel'
import store from '../redux/store'
import { signedIn } from '../redux/sessionSlice'
import * as api from '../api/databridge'

vi.mock('../api/databridge')

const finding = (over) => ({ id: 'f1', status: 'OPEN', sheet: 'TRIAL BALANCE', rowNo: 2, field: 'Debit',
  message: 'GL 102110 BOSA Loans - Principal is 81,000.00 below its subledger', ...over })
const lines = (f) => [
  { line: { lineNo: 1, type: 'TB', name: 'Trial balance', left: 100, right: 100, variance: 0, status: 'TIES', sources: 'TRIAL BALANCE' }, finding: null },
  { line: { lineNo: 2, type: 'CONTROL', controlId: 'bosa-loans', glAccount: '102110', name: 'BOSA Loans - Principal',
    left: 28516149.13, right: 28597149.13, variance: 81000, status: 'VARIANCE', sources: 'BOSA LOANS / Principal' }, finding: f },
  { line: { lineNo: 3, type: 'CONTROL', controlId: 'fosa', glAccount: '201210', name: 'FOSA Savings', left: 5, right: 5, variance: 0, status: 'TIES' }, finding: null },
]
const as = (username, roles) => store.dispatch(signedIn({ user: { username, displayName: username, roles }, authMode: 'local' }))

describe('reconciliation panel', () => {
  beforeEach(() => vi.resetAllMocks())

  it('shows each control against its subledger, with the variance', async () => {
    as('cora', ['CONSULTANT'])
    api.getReconciliation.mockResolvedValue(lines(finding()))
    renderPage(<ReconciliationPanel checkId="c1" />)
    const row = (await screen.findByText('BOSA Loans - Principal')).closest('tr')
    expect(within(row).getByText('81,000.00')).toBeInTheDocument()
    expect(within(row).getByText('Variance')).toBeInTheDocument()
    expect(within(row).getByText('Not explained')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Explain' })).toBeInTheDocument()
  })

  it('a consultant explains a variance', async () => {
    as('cora', ['CONSULTANT'])
    api.getReconciliation.mockResolvedValue(lines(finding()))
    api.requestWaiver.mockResolvedValue({})
    renderPage(<ReconciliationPanel checkId="c1" />)
    await userEvent.click(await screen.findByRole('button', { name: 'Explain' }))
    await userEvent.type(screen.getByLabelText('What causes the variance and how it will be cleared'), 'Loan written off after cutoff')
    await userEvent.click(screen.getByRole('button', { name: 'Explain the variance' }))
    expect(api.requestWaiver).toHaveBeenCalledWith('f1', 'Loan written off after cutoff')
  })

  it('only Finance sees Approve, and never on their own explanation', async () => {
    const waiting = finding({ status: 'WAIVER_REQUESTED', requestedBy: 'cora', waiverReason: 'Written off' })
    as('rita', ['REVIEWER'])
    api.getReconciliation.mockResolvedValue(lines(waiting))
    const { unmount } = renderPage(<ReconciliationPanel checkId="c1" />)
    expect(await screen.findByText('Finance approves')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    unmount()

    as('fiona', ['FINANCE'])
    renderPage(<ReconciliationPanel checkId="c1" />)
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeInTheDocument()
  })
})
