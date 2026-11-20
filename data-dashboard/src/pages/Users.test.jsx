import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '../test/render'
import Users from './Users'
import store from '../redux/store'
import { signedIn } from '../redux/sessionSlice'
import * as api from '../api/databridge'

vi.mock('../api/databridge')

describe('user administration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    store.dispatch(signedIn({ user: { username: 'admin', displayName: 'Admin', roles: ['ADMIN'] }, authMode: 'local' }))
  })

  it('creates a user with the roles ticked, and shows the temporary password once', async () => {
    api.getUsers.mockResolvedValue([])
    api.createUser.mockResolvedValue({ user: { id: 'u2', username: 'fiona', displayName: 'Fiona' }, temporaryPassword: 'Temp-123456789' })
    renderPage(<Users />)
    await userEvent.click(await screen.findByRole('button', { name: /Add user/ }))
    await userEvent.type(screen.getByLabelText('User name'), 'fiona')
    await userEvent.type(screen.getByLabelText('Full name'), 'Fiona')
    await userEvent.click(screen.getByRole('checkbox', { name: /Consultant/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Finance/ }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Add user' }).at(-1))
    await waitFor(() => expect(api.createUser).toHaveBeenCalledWith({ username: 'fiona', displayName: 'Fiona', roles: ['FINANCE'] }))
    expect(await screen.findByText('Temp-123456789')).toBeInTheDocument()
  })

  it('is closed to anyone but administrators', async () => {
    store.dispatch(signedIn({ user: { username: 'cora', displayName: 'Cora', roles: ['CONSULTANT'] }, authMode: 'local' }))
    renderPage(<Users />)
    expect(screen.getByText('Only administrators manage users.')).toBeInTheDocument()
    expect(api.getUsers).not.toHaveBeenCalled()
  })
})
