import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '../test/render'
import Cleaning from './Cleaning'
import store from '../redux/store'
import { signedIn } from '../redux/sessionSlice'
import * as api from '../api/databridge'

vi.mock('../api/databridge')

const overview = [{
  client: { id: 'c1', code: 'S', name: 'Sample SACCO' },
  projects: [{ project: { id: 'p1', name: 'Go-live' }, runs: [{ run: { id: 'r1', runNo: 1, type: 'MOCK', cutoffDate: '2026-10-31', state: 'OPEN' } }] }],
}]
const job = { id: 'j1', runId: 'r1', kind: 'STATIC', fileName: 'Static.xlsx', cells: 24, rowsEmptied: 1, status: 'SUCCEEDED', createdAt: '2026-11-20T04:00:00Z', createdBy: 'cora' }

describe('cleaning', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    store.dispatch(signedIn({ user: { username: 'cora', displayName: 'Cora', roles: ['CONSULTANT'] }, authMode: 'local' }))
    api.getOverview.mockResolvedValue(overview)
  })

  it('cleans each workbook, downloads it and shows the change log without values', async () => {
    api.getCleaningJobs.mockResolvedValueOnce([]).mockResolvedValue([job])
    api.cleanWorkbook.mockResolvedValue({ blob: new Blob(['x']), fileName: 'Static (cleaned).xlsx', jobId: 'j1' })
    api.getCleaningJob.mockResolvedValue({ job, changes: [
      { sheet: 'Members', field: 'Phone No.', column: 'I', ruleId: 'members.phone', action: 'PHONE_KE', cells: 1, rows: '43' },
    ] })
    renderPage(<Cleaning />, { route: '/cleaning?run=r1' })
    const file = new File(['PK'], 'Sample Static Data Templates.xlsx')
    await userEvent.upload(document.querySelector('input[type=file]'), file)
    expect(await screen.findByText('Sample Static Data Templates.xlsx')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clean and download' }))
    expect(await screen.findByText('Cleaned and downloaded')).toBeInTheDocument()
    expect(api.cleanWorkbook).toHaveBeenCalledWith('r1', 'STATIC', file, expect.any(Function))
    expect(api.saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'Static (cleaned).xlsx')

    const row = (await screen.findByText('Static.xlsx')).closest('tr')
    await userEvent.click(within(row).getByRole('button', { name: /expand/i }))
    expect(await screen.findByText('Phone to +254')).toBeInTheDocument()
    expect(screen.getByText('43')).toBeInTheDocument()
  })

  it("shows the server's reason when a workbook cannot be cleaned", async () => {
    api.getCleaningJobs.mockResolvedValue([])
    api.cleanWorkbook.mockRejectedValue(new Error('The workbook could not be cleaned: not a zip file'))
    renderPage(<Cleaning />, { route: '/cleaning?run=r1' })
    await userEvent.upload(document.querySelector('input[type=file]'), new File(['x'], 'Bad.xlsx'))
    await userEvent.click(await screen.findByRole('button', { name: 'Clean and download' }))
    expect(await screen.findByText(/could not be cleaned/)).toBeInTheDocument()
    expect(api.saveBlob).not.toHaveBeenCalled()
  })

  it('viewers cannot clean', async () => {
    store.dispatch(signedIn({ user: { username: 'vic', displayName: 'Vic', roles: ['VIEWER'] }, authMode: 'local' }))
    api.getCleaningJobs.mockResolvedValue([])
    renderPage(<Cleaning />, { route: '/cleaning?run=r1' })
    expect(await screen.findByText('Cleaning history')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clean and download' })).not.toBeInTheDocument()
  })
})
