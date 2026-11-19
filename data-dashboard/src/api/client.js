import axios from 'axios'
import store from '../redux/store'

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
  config.headers['X-DataBridge-User'] = store.getState().session.actor || 'local'
  return config
})

http.interceptors.response.use(
  (response) => response,
  (err) => Promise.reject(toApiError(err)),
)
