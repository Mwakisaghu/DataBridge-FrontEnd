import { createSlice } from '@reduxjs/toolkit'

// Who is using the UI.
//  - status: 'checking' until the server says, then 'signedIn' or 'signedOut'.
//  - authMode: 'local' (DataBridge accounts) or 'none' (development: no sign-in).
//  - user: the signed-in user from /api/auth/me.
//  - actor: in development mode only, the name the person gives; sent as X-DataBridge-User and
//    recorded in the audit trail. Kept in this browser between visits.
const KEY = 'databridge.actor'

function stored() {
  try {
    return window.localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

const sessionSlice = createSlice({
  name: 'session',
  initialState: { actor: stored(), status: 'checking', authMode: null, user: null },
  reducers: {
    setActor(state, action) {
      const name = (action.payload || '').trim().slice(0, 100)
      state.actor = name
      try {
        window.localStorage.setItem(KEY, name)
      } catch {
        // storage unavailable: the name lasts for this visit only
      }
    },
    signedIn(state, action) {
      state.status = 'signedIn'
      state.user = action.payload.user
      state.authMode = action.payload.authMode
    },
    signedOut(state) {
      state.status = 'signedOut'
      state.user = null
    },
  },
})

export const { setActor, signedIn, signedOut } = sessionSlice.actions
export default sessionSlice.reducer

/** The name the server records for the person using the UI. */
export const selectWho = (s) =>
  s.session.authMode === 'local' ? s.session.user?.username || '' : s.session.actor || 'local'

/** True when the signed-in user holds one of the roles; ADMIN holds them all. */
export function hasRole(user, ...roles) {
  const mine = user?.roles || []
  return mine.includes('ADMIN') || roles.some((r) => mine.includes(r))
}
