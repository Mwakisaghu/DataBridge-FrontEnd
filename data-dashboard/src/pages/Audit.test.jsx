import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '../test/render'
import { ClientFiles } from './Audit'
import * as api from '../api/databridge'

vi.mock('../api/databridge')

describe('Clearing client files', () => {
  beforeEach(() => {
    vi.mocked(api.getSetup).mockResolvedValue({ retention: { mode: 'PURGE_ON_COMPLETE', keepHours: 24 } })
  })

  it('states the retention policy in force', async () => {
    renderPage(<ClientFiles />)
    expect(await screen.findByText(/destroyed as soon as each upload has been read/)).toBeInTheDocument()
  })

  it('asks for confirmation, clears everything and reports what was removed', async () => {
    vi.mocked(api.purgeAll).mockResolvedValue({ workspaces: 2, files: 3, bytes: 2048 })
    const onPurged = vi.fn()
    renderPage(<ClientFiles onPurged={onPurged} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Clear all client files' }))
    expect(api.purgeAll).not.toHaveBeenCalled()
    const confirm = await screen.findAllByRole('button', { name: 'Clear all client files' })
    await userEvent.click(confirm[confirm.length - 1])
    await waitFor(() => expect(api.purgeAll).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Cleared 3 files (2.0 KB) from 2 workspaces')).toBeInTheDocument()
    expect(onPurged).toHaveBeenCalled()
  })
})
