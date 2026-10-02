import { describe, expect, it } from 'vitest'
import { diaValidoMaisProximo, passoDiaValido } from './diasUteis'

// 2026-10-02 é sexta; 2026-10-03 sábado; 2026-10-05 segunda.
describe('diaValidoMaisProximo', () => {
  it('mantém o dia quando já é dia de aula', () => {
    expect(diaValidoMaisProximo('2026-10-02', [1, 2, 3, 4, 5])).toBe('2026-10-02')
  })

  it('pula o fim de semana', () => {
    expect(diaValidoMaisProximo('2026-10-03', [1, 2, 3, 4, 5])).toBe('2026-10-05')
  })

  it('pula feriado', () => {
    expect(diaValidoMaisProximo('2026-10-12', [1, 2, 3, 4, 5], new Set(['2026-10-12']))).toBe('2026-10-13')
  })
})

describe('passoDiaValido', () => {
  it('anda para o próximo e para o anterior dia de aula da turma', () => {
    // turma com aula só às terças (2) e quintas (4)
    expect(passoDiaValido('2026-10-01', 1, [2, 4])).toBe('2026-10-06')
    expect(passoDiaValido('2026-10-06', -1, [2, 4])).toBe('2026-10-01')
  })
})
