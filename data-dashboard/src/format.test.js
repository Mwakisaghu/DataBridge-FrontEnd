import { describe, expect, it } from 'vitest'
import { describeRule, kindFromName } from './format'

describe('helpers', () => {
  it('takes the template kind from the file name', () => {
    expect(kindFromName('Static Data Templates.xlsx')).toBe('STATIC')
    expect(kindFromName('HR Data Templates..xlsx')).toBe('HR')
    expect(kindFromName('Sample Transactional Data Templates.xlsx')).toBe('TRANSACTIONAL')
    expect(kindFromName('chrome.xlsx')).toBe('OTHER')
  })

  it('describes a rule in a sentence', () => {
    expect(describeRule({ type: 'REFERENCE', field: 'Loan Number', targetSheet: 'Loans', targetField: 'Loan No.' }))
      .toBe('Loan Number must exist in Loans (Loan No.)')
  })
})
