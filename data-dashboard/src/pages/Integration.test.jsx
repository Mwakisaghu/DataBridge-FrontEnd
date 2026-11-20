import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '../test/render'
import Integration from './Integration'
import store from '../redux/store'
import { signedIn } from '../redux/sessionSlice'
import * as api from '../api/databridge'

vi.mock('../api/databridge')

const overview = [{
  client: { id: 'c1', code: 'S', name: 'Sample SACCO' },
  projects: [{ project: { id: 'p1', name: 'Go-live' }, runs: [{ run: { id: 'r1', runNo: 1, type: 'MOCK', cutoffDate: '2026-10-31', state: 'OPEN' } }] }],
}]
const pkg = { id: 'k1', fileName: 'Static.xlsx', kind: 'STATIC', checkId: 'ch1', createdAt: '2026-11-20T04:00:00Z', createdBy: 'cora',
  tables: [{ order: 1, sheet: 'Customer Employer_Tenant', tableId: 18, rows: 8 }, { order: 2, sheet: 'Members', tableId: 52185700, rows: 150 }] }
const imports = [
  { sheet: 'Members', tableId: 52185700, expectedRows: 150, importedRows: null, bcCount: null, status: 'PENDING' },
  { sheet: 'Customer Employer_Tenant', tableId: 18, expectedRows: 8, importedRows: 8, bcCount: 5, status: 'MISMATCH',
    note: 'Business Central holds 5 customers; the package had 8' },
]

describe('integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    store.dispatch(signedIn({ user: { username: 'cora', displayName: 'Cora', roles: ['CONSULTANT'] }, authMode: 'local' }))
    api.getOverview.mockResolvedValue(overview)
  })

  it('builds the package from the validated file and downloads it', async () => {
    api.getPackages.mockResolvedValue([])
    api.getImports.mockResolvedValue([])
    api.buildPackage.mockResolvedValue({ blob: new Blob(['PK']), fileName: 'Static (import package).xlsx', jobId: 'k1' })
    renderPage(<Integration />, { route: '/integration?run=r1' })
    const file = new File(['PK'], 'Sample Static Data Templates.xlsx')
    await userEvent.upload(await screen.findByText('Drop the validated workbook, or click to choose').then(() => document.querySelector('input[type=file]')), file)
    await userEvent.click(await screen.findByRole('button', { name: 'Build and download package' }))
    expect(api.buildPackage).toHaveBeenCalledWith('r1', 'STATIC', file)
    expect(api.saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'Static (import package).xlsx')
  })

  it("shows why a package is refused", async () => {
    api.getPackages.mockResolvedValue([])
    api.getImports.mockResolvedValue([])
    api.buildPackage.mockRejectedValue(new Error('Check 1 still has 3 Critical finding(s) in the STATIC workbook'))
    renderPage(<Integration />, { route: '/integration?run=r1' })
    await screen.findByText('Drop the validated workbook, or click to choose')
    await userEvent.upload(document.querySelector('input[type=file]'), new File(['PK'], 'Static.xlsx'))
    await userEvent.click(await screen.findByRole('button', { name: 'Build and download package' }))
    expect(await screen.findByText(/3 Critical finding/)).toBeInTheDocument()
    expect(api.saveBlob).not.toHaveBeenCalled()
  })

  it('tracks imports in package order, records results and reads counts back', async () => {
    api.getPackages.mockResolvedValue([pkg])
    api.getImports.mockResolvedValue(imports)
    api.recordImport.mockResolvedValue({})
    api.verifyImports.mockResolvedValue([{ ...imports[0], status: 'MATCHED' }])
    renderPage(<Integration />, { route: '/integration?run=r1' })
    const tracking = (await screen.findByText('Import tracking')).closest('.ant-card')
    const bodyRows = within(tracking).getAllByRole('row').slice(1)
    expect(within(bodyRows[0]).getByText('Customer Employer_Tenant')).toBeInTheDocument()
    expect(within(bodyRows[0]).getByText('Count differs')).toBeInTheDocument()

    await userEvent.click(within(bodyRows[1]).getByRole('button', { name: 'Record' }))
    await userEvent.clear(screen.getByLabelText('Rows imported'))
    await userEvent.type(screen.getByLabelText('Rows imported'), '145')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(api.recordImport).toHaveBeenCalledWith('r1', 'Members', { importedRows: 145, failed: false, note: '' })

    await userEvent.click(screen.getByRole('button', { name: /Read counts from Business Central/ }))
    expect(api.verifyImports).toHaveBeenCalledWith('r1')
  })
})
