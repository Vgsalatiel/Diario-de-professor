import { describe, expect, it } from 'vitest'
import { normalizarContatoVapid } from './push'

describe('normalizarContatoVapid', () => {
  it('e-mail puro ganha o mailto:', () => {
    expect(normalizarContatoVapid(' prof@gmail.com ')).toBe('mailto:prof@gmail.com')
  })

  it('mailto: e URL passam como estão', () => {
    expect(normalizarContatoVapid('mailto:prof@gmail.com')).toBe('mailto:prof@gmail.com')
    expect(normalizarContatoVapid('https://diario.app')).toBe('https://diario.app')
  })

  it('vazio usa o contato padrão', () => {
    expect(normalizarContatoVapid(undefined)).toBe('mailto:contato@example.com')
  })
})
