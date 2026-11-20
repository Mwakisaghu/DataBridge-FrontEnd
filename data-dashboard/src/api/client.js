import axios from 'axios'
import store from '../redux/store'
import { signedOut } from '../redux/sessionSlice'

/** A failed call, with a message written for the person using the UI. */
export class ApiError extends Error {
  constructor(message, status = 0, body = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export const SERVER_DOWN =
  "Can't reach the DataBridge server. Start it with: java -jar databridge-app/target/databridge-app.jar"

/** Turns an axios failure into an ApiError carrying the server's own explanation. */
export function toApiError(err) {
  if (err instanceof ApiError) return err
  const res = err?.response
  if (res) {
    const serverMessage = res.data && typeof res.data === 'object' ? res.data.error : null
    // The dev proxy answers 502/504 when the server is not running.
    if (!serverMessage && (res.status === 502 || res.status === 503 || res.status === 504)) {
      return new ApiError(SERVER_DOWN, res.status, res.data)
    }
    return new ApiError(serverMessage || `The server answered ${res.status}`, res.status, res.data)
  }
  if (err?.request) return new ApiError(SERVER_DOWN, 0)
  return new ApiError(err?.message || 'Something went wrong', 0)
}

export const http = axios.create({ baseURL: '/api' })

http.interceptors.request.use((config) => {
  config.headers = config.headers || {}
  // Marks the call as coming from this app: the server refuses changes without it, which
  // stops other web sites from posting to DataBridge with the user's cookie.
  config.headers['X-DataBridge-Client'] = 'web'
  // Development mode (no sign-in) only; ignored by the server when sign-in is on.
  config.headers['X-DataBridge-User'] = store.getState().session.actor || 'local'
  return config
})

http.interceptors.response.use(
  (response) => response,
  (err) => {
    const e = toApiError(err)
    // A session that ran out: back to the sign-in screen. A failed sign-in stays on it.
    const url = err?.config?.url || ''
    if (e.status === 401 && !url.startsWith('/auth/login') && store.getState().session.status === 'signedIn') {
      store.dispatch(signedOut())
    }
    return Promise.reject(e)
  },
)
