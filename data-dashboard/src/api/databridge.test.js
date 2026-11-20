import { afterEach, describe, expect, it } from 'vitest'
import { AxiosError } from 'axios'
import { http } from './client'
import { cleanWorkbook } from './databridge'

const original = http.defaults.adapter

describe('file calls', () => {
  afterEach(() => {
    http.defaults.adapter = original
  })

  it("reads the server's reason out of a refused file request", async () => {
    http.defaults.adapter = async (config) => {
      const data = new Blob([JSON.stringify({ status: 'ERROR', error: 'The workbook could not be cleaned: not a zip file' })])
      throw new AxiosError('failed', 'ERR_BAD_REQUEST', config, {}, { status: 400, data, headers: {}, config, statusText: '' })
    }
    await expect(cleanWorkbook('r1', 'STATIC', new File(['x'], 'Bad.xlsx')))
      .rejects.toMatchObject({ status: 400, message: 'The workbook could not be cleaned: not a zip file' })
  })

  it('returns the cleaned file, its name and the change-log id', async () => {
    let seen
    http.defaults.adapter = async (config) => {
      seen = config.params
      return { data: new Blob(['PK']), status: 200, statusText: 'OK', config,
        headers: { 'content-disposition': 'attachment; filename="Static (cleaned).xlsx"', 'x-databridge-cleaning-job': 'j9' } }
    }
    const out = await cleanWorkbook('r1', 'STATIC', new File(['x'], 'Static.xlsx'))
    expect(seen).toEqual({ kind: 'STATIC', fileName: 'Static.xlsx' })
    expect(out.fileName).toBe('Static (cleaned).xlsx')
    expect(out.jobId).toBe('j9')
  })
})
