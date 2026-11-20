import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '../test/render'
import { GeneralSetup } from './Setup'
import * as api from '../api/databridge'

vi.mock('../api/databridge')

const setup = {
  workspaceDir: '${java.io.tmpdir}/databridge-workspaces',
  retention: { mode: 'PURGE_ON_COMPLETE', keepHours: 24, maxRunHours: 6, secureOverwrite: true, sweepOnStartup: true },
  findingValueMode: 'MASKED',
  captionScanRows: 10,
  maxUploadMb: 200,
}

describe('DataBridge and retention setup', () => {
  beforeEach(() => {
    vi.mocked(api.getSetup).mockResolvedValue(setup)
    vi.mocked(api.patchSetup).mockImplementation(async (v) => v)
  })

  it('shows the stored values and saves changes', async () => {
    renderPage(<GeneralSetup />)
    const limit = await screen.findByLabelText('Largest workbook accepted (MB)')
    await waitFor(() => expect(limit).toHaveValue('200'))

    await userEvent.clear(limit)
    await userEvent.type(limit, '300')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(api.patchSetup).toHaveBeenCalled())
    const sent = vi.mocked(api.patchSetup).mock.calls[0][0]
    expect(sent.maxUploadMb).toBe(300)
    expect(sent.retention.mode).toBe('PURGE_ON_COMPLETE')
    expect(await screen.findByText('Setup saved')).toBeInTheDocument()
  })

  it('shows the hours to keep files only when files are kept', async () => {
    vi.mocked(api.getSetup).mockResolvedValue({ ...setup, retention: { ...setup.retention, mode: 'KEEP_FOR_HOURS' } })
    renderPage(<GeneralSetup />)
    expect(await screen.findByLabelText('Keep files for (hours)')).toBeInTheDocument()
  })

  it("shows the server's reason when a save is refused", async () => {
    vi.mocked(api.patchSetup).mockRejectedValue(new Error('captionScanRows must be 1-50'))
    renderPage(<GeneralSetup />)
    await screen.findByDisplayValue('200')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('captionScanRows must be 1-50')).toBeInTheDocument()
  })
})
