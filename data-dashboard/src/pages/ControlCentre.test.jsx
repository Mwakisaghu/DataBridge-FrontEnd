import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '../test/render'
import ControlCentre from './ControlCentre'
import * as api from '../api/databridge'

vi.mock('../api/databridge')

const overview = [
  {
    client: { id: 'c1', code: 'AZIMA', name: 'AZIMA DT SACCO' },
    projects: [
      {
        project: { id: 'p1', clientId: 'c1', code: 'BC', name: 'BC go-live', bcCompany: null },
        runs: [
          { run: { id: 'r1', runNo: 1, type: 'MOCK', cutoffDate: '2026-10-31', state: 'OPEN' }, datasets: 3, failedDatasets: 1 },
        ],
      },
    ],
  },
]

describe('Control Centre', () => {
  beforeEach(() => {
    vi.mocked(api.getOverview).mockResolvedValue(overview)
  })

  it('shows clients, their projects and runs with upload counts', async () => {
    renderPage(<ControlCentre />)
    expect(await screen.findByText('AZIMA')).toBeInTheDocument()
    expect(screen.getByText('BC go-live')).toBeInTheDocument()
    expect(screen.getByText('Mock run 1')).toBeInTheDocument()
    expect(screen.getByText('(1 failed)')).toBeInTheDocument()
  })

  it('adds a client and shows the server reason if it is refused', async () => {
    vi.mocked(api.createClient).mockRejectedValueOnce(new Error('Client code AZIMA already exists'))
    renderPage(<ControlCentre />)
    await screen.findByText('AZIMA')
    await userEvent.click(screen.getByRole('button', { name: /Add client/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Client code'), 'azima')
    await userEvent.type(within(dialog).getByLabelText('Client name'), 'Again')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add client' }))
    expect(await within(dialog).findByText('Client code AZIMA already exists')).toBeInTheDocument()
    expect(api.createClient).toHaveBeenCalledWith({ code: 'azima', name: 'Again' })
  })

  it('rejects a client code the server would refuse, before sending it', async () => {
    renderPage(<ControlCentre />)
    await screen.findByText('AZIMA')
    await userEvent.click(screen.getByRole('button', { name: /Add client/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Client code'), 'A B')
    await userEvent.type(within(dialog).getByLabelText('Client name'), 'Spaces')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add client' }))
    expect(await within(dialog).findByText('2 to 20 letters, digits, - or _')).toBeInTheDocument()
    await waitFor(() => expect(api.createClient).not.toHaveBeenCalled())
  })
})
