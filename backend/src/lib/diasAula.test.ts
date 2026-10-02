import { describe, expect, it } from 'vitest'
import { calcularDatasDeAula } from './diasAula'

describe('calcularDatasDeAula', () => {
  it('cruza os dias da semana da turma com o período, pulando feriados', () => {
    // Semana de 05/10/2026 (segunda) a 09/10 (sexta); aula seg e qua; 07/10 é feriado.
    expect(calcularDatasDeAula('2026-10-05', '2026-10-09', [1, 3], new Set(['2026-10-07']))).toEqual(['2026-10-05'])
  })

  it('sem dias de aula definidos usa segunda a sexta', () => {
    expect(calcularDatasDeAula('2026-10-03', '2026-10-06', [])).toEqual(['2026-10-05', '2026-10-06'])
  })
})
