import { describe, expect, it } from 'vitest'
import { proximaEtapaBncc } from './progressaoBncc'

describe('proximaEtapaBncc', () => {
  it('avança um ano dentro da etapa', () => {
    expect(proximaEtapaBncc('fundamental', 8)).toEqual({ etapaBncc: 'fundamental', anoSerieBncc: 9 })
    expect(proximaEtapaBncc('medio', 1)).toEqual({ etapaBncc: 'medio', anoSerieBncc: 2 })
  })

  it('9º do Fundamental vira 1º do Médio', () => {
    expect(proximaEtapaBncc('fundamental', 9)).toEqual({ etapaBncc: 'medio', anoSerieBncc: 1 })
  })

  it('3º do Médio fica sem ano (não há seguinte)', () => {
    expect(proximaEtapaBncc('medio', 3)).toEqual({ etapaBncc: 'medio', anoSerieBncc: null })
  })

  it('sem etapa ou ano não inventa nada', () => {
    expect(proximaEtapaBncc(null, null)).toEqual({ etapaBncc: null, anoSerieBncc: null })
    expect(proximaEtapaBncc('fundamental', null)).toEqual({ etapaBncc: 'fundamental', anoSerieBncc: null })
  })
})
