import { describe, expect, it } from 'vitest'
import type { Avaliacao } from '../types'
import { arredondar, calcularMedia, chaveNota, formatarNota, situacao } from './media'

const av = (id: string, peso = 1): Avaliacao => ({ id, turmaId: 't', nome: id, peso, periodo: '1' })
const notas = (valores: Record<string, number | null>) =>
  Object.fromEntries(Object.entries(valores).map(([avId, v]) => [chaveNota('a1', avId), v]))

describe('calcularMedia', () => {
  it('média simples ignora avaliação sem nota', () => {
    expect(calcularMedia('a1', [av('p1'), av('p2'), av('p3')], notas({ p1: 8, p2: 6, p3: null }), 'simples')).toBe(7)
  })

  it('média ponderada usa o peso de cada avaliação', () => {
    // (10*2 + 4*1) / 3 = 8
    expect(calcularMedia('a1', [av('p1', 2), av('p2', 1)], notas({ p1: 10, p2: 4 }), 'ponderada')).toBe(8)
  })

  it('sem nenhuma nota lançada devolve null', () => {
    expect(calcularMedia('a1', [av('p1')], {}, 'simples')).toBeNull()
  })

  it('ponderada com soma de pesos zero devolve null', () => {
    expect(calcularMedia('a1', [av('p1', 0)], notas({ p1: 7 }), 'ponderada')).toBeNull()
  })

  it('arredonda para uma casa', () => {
    // (7 + 8 + 8) / 3 = 7,666…
    expect(calcularMedia('a1', [av('p1'), av('p2'), av('p3')], notas({ p1: 7, p2: 8, p3: 8 }), 'simples')).toBe(7.7)
  })
})

describe('situacao', () => {
  it('aprova quando a média alcança o mínimo', () => {
    expect(situacao(6, 6)).toBe('aprovado')
    expect(situacao(5.9, 6)).toBe('recuperacao')
    expect(situacao(null, 6)).toBe('sem-nota')
  })
})

describe('formatação', () => {
  it('arredondar e formatarNota no padrão brasileiro', () => {
    expect(arredondar(7.25)).toBe(7.3)
    expect(formatarNota(7.5)).toBe('7,5')
    expect(formatarNota(10)).toBe('10,0')
    expect(formatarNota(null)).toBe('—')
  })
})
