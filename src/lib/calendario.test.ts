import { describe, expect, it } from 'vitest'
import { nomeDoMes, semanasDoMes, somarMeses } from './calendario'

describe('semanasDoMes', () => {
  it('semanas de segunda a sábado, sem domingo', () => {
    // Outubro/2026 começa numa quinta-feira e termina num sábado.
    const semanas = semanasDoMes('2026-10')
    expect(semanas[0].map((d) => d.data)).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03',
    ])
    expect(semanas[0][0].doMes).toBe(false)
    const ultima = semanas[semanas.length - 1]
    expect(ultima[ultima.length - 1].data).toBe('2026-10-31')
    for (const s of semanas) {
      expect(s).toHaveLength(6)
      for (const d of s) expect(new Date(d.data + 'T00:00:00Z').getUTCDay()).not.toBe(0)
    }
  })

  it('mês que começa no domingo abre na segunda-feira dia 2', () => {
    // Novembro/2026 começa num domingo.
    expect(semanasDoMes('2026-11')[0][0].data).toBe('2026-11-02')
  })

  it('cobre todos os dias úteis do mês', () => {
    const dias = semanasDoMes('2026-02').flat().filter((d) => d.doMes)
    expect(dias).toHaveLength(24) // fevereiro/2026: 28 dias, 4 domingos
  })
})

describe('navegação de mês', () => {
  it('vira o ano e escreve o nome', () => {
    expect(somarMeses('2026-12', 1)).toBe('2027-01')
    expect(somarMeses('2026-01', -1)).toBe('2025-12')
    expect(nomeDoMes('2026-10')).toBe('Outubro de 2026')
  })
})
