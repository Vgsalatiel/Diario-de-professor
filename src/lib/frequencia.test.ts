import { describe, expect, it } from 'vitest'
import type { DataAula } from '../types'
import { calcularFrequencia, chavePresenca, proximoEstado } from './frequencia'

const aula = (id: string, semAula = false): DataAula => ({ id, turmaId: 't', data: '2026-10-01', periodo: '1', semAula })

describe('calcularFrequencia', () => {
  it('conta só aulas com presença/falta lançada e ignora "sem aula"', () => {
    const datas = [aula('d1'), aula('d2'), aula('d3'), aula('d4', true)]
    const freq = {
      [chavePresenca('a1', 'd1')]: true,
      [chavePresenca('a1', 'd2')]: false,
      [chavePresenca('a1', 'd4')]: false, // dia sem aula: não conta
    }
    expect(calcularFrequencia('a1', datas, freq)).toEqual({ presencas: 1, faltas: 1, total: 2, percentual: 50 })
  })

  it('sem nada lançado o percentual é null', () => {
    expect(calcularFrequencia('a1', [aula('d1')], {}).percentual).toBeNull()
  })
})

describe('proximoEstado', () => {
  it('primeiro clique marca presença, depois alterna', () => {
    expect(proximoEstado(undefined)).toBe(true)
    expect(proximoEstado(true)).toBe(false)
    expect(proximoEstado(false)).toBe(true)
  })
})
