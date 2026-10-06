import { describe, expect, it } from 'vitest'
import { montarMensagemAviso } from './jobs.service'

describe('montarMensagemAviso', () => {
  it('um compromisso só vai direto no título, com hora e turma no corpo', () => {
    const msg = montarMensagemAviso([
      { titulo: 'Frações', tipoRotulo: 'Prova', hora: '10:00', turmaNome: '7º A' },
    ])
    expect(msg).toEqual({ titulo: 'Hoje: Prova — Frações', corpo: 'às 10:00 · 7º A', url: '/agenda' })
  })

  it('um compromisso sem hora nem turma ainda tem corpo', () => {
    const msg = montarMensagemAviso([
      { titulo: 'Conselho de classe', tipoRotulo: 'Reunião', hora: null, turmaNome: null },
    ])
    expect(msg.corpo).toBe('Confira na sua agenda.')
  })

  it('vários compromissos viram contagem no título e uma linha por item', () => {
    const msg = montarMensagemAviso([
      { titulo: 'Frações', tipoRotulo: 'Prova', hora: '10:00', turmaNome: '7º A' },
      { titulo: 'Conselho de classe', tipoRotulo: 'Reunião', hora: null, turmaNome: null },
    ])
    expect(msg.titulo).toBe('Hoje você tem 2 compromissos')
    expect(msg.corpo).toBe('10:00 Frações (7º A)\nConselho de classe')
  })
})
