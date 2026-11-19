import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '../test/render'
import AuthGate from './AuthGate'
import store from '../redux/store'
import { signedIn, signedOut, hasRole, selectWho } from '../redux/sessionSlice'
import { ApiError } from '../api/client'
import * as api from '../api/databridge'

vi.mock('../api/databridge')

const harry = { id: 'u1', username: 'harry', displayName: 'Harrison M', roles: ['CONSULTANT'], active: true, mustChangePassword: false }

describe('sign-in', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    store.dispatch(signedOut())
  })

  it('shows the sign-in screen when nobody is signed in, and the app once someone is', async () => {
    store.dispatch(signedOut())
    api.login.mockResolvedValue({ user: harry, authMode: 'local' })
    renderPage(<AuthGate><p>The app</p></AuthGate>)
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('User name'), 'harry')
    await userEvent.type(screen.getByLabelText('Password'), 'my-own-password-1')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('The app')).toBeInTheDocument()
    expect(api.login).toHaveBeenCalledWith('harry', 'my-own-password-1')
    expect(selectWho(store.getState())).toBe('harry')
  })

  it("shows the server's reason when sign-in fails", async () => {
    store.dispatch(signedOut())
    api.login.mockRejectedValue(new ApiError('Wrong user name or password', 401))
    renderPage(<AuthGate><p>The app</p></AuthGate>)
    await userEvent.type(screen.getByLabelText('User name'), 'harry')
    await userEvent.type(screen.getByLabelText('Password'), 'nope-nope-nope-1')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong user name or password')
    expect(screen.queryByText('The app')).not.toBeInTheDocument()
  })

  it('asks for a new password while a temporary one is in use', async () => {
    store.dispatch(signedIn({ user: { ...harry, mustChangePassword: true }, authMode: 'local' }))
    api.changePassword.mockResolvedValue({ user: harry, authMode: 'local' })
    renderPage(<AuthGate><p>The app</p></AuthGate>)
    expect(screen.getByRole('heading', { name: 'Choose your password' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Current password'), 'Temp-pass-123456')
    await userEvent.type(screen.getByLabelText('New password'), 'short')
    await userEvent.type(screen.getByLabelText('New password again'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Use at least 12 characters')).toBeInTheDocument()
    expect(api.changePassword).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText('New password'))
    await userEvent.type(screen.getByLabelText('New password'), 'my-own-password-1')
    await userEvent.clear(screen.getByLabelText('New password again'))
    await userEvent.type(screen.getByLabelText('New password again'), 'my-own-password-1')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    await waitFor(() => expect(api.changePassword).toHaveBeenCalledWith('Temp-pass-123456', 'my-own-password-1'))
    expect(await screen.findByText('The app')).toBeInTheDocument()
  })

  it('administrators hold every role', () => {
    expect(hasRole({ roles: ['ADMIN'] }, 'REVIEWER')).toBe(true)
    expect(hasRole({ roles: ['VIEWER'] }, 'REVIEWER')).toBe(false)
    expect(hasRole(null, 'VIEWER')).toBe(false)
  })
})
