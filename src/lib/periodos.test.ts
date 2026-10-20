import { describe, expect, it } from 'vitest'
import { periodoDaData } from './periodos'

describe('periodoDaData', () => {
  it('bimestre segue o calendário fev–dez', () => {
    expect(periodoDaData('bimestre', '2026-03-10')).toBe('1')
    expect(periodoDaData('bimestre', '2026-06-01')).toBe('2')
    expect(periodoDaData('bimestre', '2026-08-20')).toBe('3')
    expect(periodoDaData('bimestre', '2026-10-20')).toBe('4')
  })

  it('trimestre e semestre', () => {
    expect(periodoDaData('trimestre', '2026-04-30')).toBe('1')
    expect(periodoDaData('trimestre', '2026-07-15')).toBe('2')
    expect(periodoDaData('trimestre', '2026-11-03')).toBe('3')
    expect(periodoDaData('semestre', '2026-07-31')).toBe('1')
    expect(periodoDaData('semestre', '2026-08-01')).toBe('2')
  })
})
