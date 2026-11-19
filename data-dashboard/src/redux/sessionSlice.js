import { createSlice } from '@reduxjs/toolkit'

// Who is using the UI. Until sign-in arrives the user names themselves; the name is sent as
// X-DataBridge-User and recorded in the audit trail. Kept in this browser between visits.
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
  initialState: { actor: stored() },
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
  },
})

export const { setActor } = sessionSlice.actions
export default sessionSlice.reducer
