import { describe, expect, it } from 'vitest'
import { AxiosError } from 'axios'
import { ApiError, SERVER_DOWN, http, toApiError } from './client'
import store from '../redux/store'
import { setActor } from '../redux/sessionSlice'

const respond = (status, data) => async (config) => {
  if (status >= 400) {
    throw new AxiosError('failed', 'ERR_BAD_RESPONSE', config, {}, { status, data, headers: {}, config, statusText: '' })
  }
  return { data, status, statusText: 'OK', headers: {}, config }
}

describe('API client', () => {
  it('sends the person acting in the X-DataBridge-User header', async () => {
    store.dispatch(setActor('  Harrison Mwakisaghu '))
    let seen
    const r = await http.get('/clients', {
      adapter: async (config) => {
        seen = config.headers['X-DataBridge-User']
        return { data: [], status: 200, statusText: 'OK', headers: {}, config }
      },
    })
    expect(r.status).toBe(200)
    expect(seen).toBe('Harrison Mwakisaghu')
  })

  it("passes on the server's own explanation of a failure", async () => {
    await expect(http.get('/runs/x', { adapter: respond(404, { status: 'ERROR', error: 'Run not found: x' }) }))
      .rejects.toMatchObject({ name: 'ApiError', status: 404, message: 'Run not found: x' })
  })

  it('explains that the server is down when the dev proxy cannot reach it', () => {
    const e = toApiError({ response: { status: 502, data: '' } })
    expect(e).toBeInstanceOf(ApiError)
    expect(e.message).toBe(SERVER_DOWN)
  })

  it('explains that the server is down when nothing answers', () => {
    expect(toApiError({ request: {} }).message).toBe(SERVER_DOWN)
  })
})
