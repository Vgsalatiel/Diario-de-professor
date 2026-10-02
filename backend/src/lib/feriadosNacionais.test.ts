import { describe, expect, it } from 'vitest'
import { feriadosNacionais } from './feriadosNacionais'

const datas = (ano: number) => feriadosNacionais(ano).map((f) => f.data)

describe('feriadosNacionais', () => {
  it('calcula os feriados móveis a partir da Páscoa', () => {
    // Páscoa de 2026: 5 de abril
    expect(datas(2026)).toEqual(
      expect.arrayContaining(['2026-04-05', '2026-04-03', '2026-02-17', '2026-06-04']),
    )
  })

  it('inclui o 20/11 só a partir de 2024 (Lei 14.759/2023)', () => {
    expect(datas(2026)).toContain('2026-11-20')
    expect(datas(2024)).toContain('2024-11-20')
    expect(datas(2023)).not.toContain('2023-11-20')
  })

  it('tem os feriados fixos', () => {
    expect(datas(2026)).toEqual(
      expect.arrayContaining(['2026-01-01', '2026-04-21', '2026-05-01', '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-12-25']),
    )
  })
})
