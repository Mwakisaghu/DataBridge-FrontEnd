import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '../test/render'
import { SheetResults } from './Intake'

const sheets = [
  { sheetName: 'Members', tableName: 'Members', tableId: 52185700, captionRow: 3, columns: 60, typedColumns: 60, warnings: [] },
  {
    sheetName: 'Loan Recovery Header', tableName: null, tableId: null, captionRow: 1, columns: 19, typedColumns: 19,
    warnings: ['No BC table ID in the banner row and no Template Setup for this sheet'],
  },
]

describe('Upload result per sheet', () => {
  it('shows the BC table, typed columns and warnings for each sheet', async () => {
    renderPage(<SheetResults sheets={sheets} />)
    expect(screen.getByText('52185700')).toBeInTheDocument()
    expect(screen.getByText('60 of 60')).toBeInTheDocument()
    expect(screen.getByText('Not known')).toBeInTheDocument()
    expect(screen.getByText('None')).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: /expand row/i })[0])
    expect(await screen.findByText(/No BC table ID in the banner row/)).toBeInTheDocument()
  })
})
