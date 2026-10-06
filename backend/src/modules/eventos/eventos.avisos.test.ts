import { describe, expect, it } from 'vitest'
import { montarAvisoMudanca } from './eventos.avisos'

const HOJE = '2026-10-06'
const AMANHA = '2026-10-07'
const reuniao = { id: 'e1', titulo: 'Pais 7º A', tipo: 'reuniao', concluido: false }

describe('montarAvisoMudanca', () => {
  it('reunião remarcada de 10h pra 11h hoje avisa com o horário novo e o antigo', () => {
    const msg = montarAvisoMudanca(
      { data: HOJE, hora: '10:00' },
      { ...reuniao, data: HOJE, hora: '11:00' },
      '7º A',
      HOJE,
      AMANHA,
    )
    expect(msg).toEqual({
      titulo: 'Remarcado: Reunião — Pais 7º A',
      corpo: 'Agora: hoje às 11:00 · 7º A (antes: hoje às 10:00)',
      url: '/agenda',
      tag: 'evento-e1',
    })
  })

  it('compromisso de hoje adiado pra semana que vem também avisa', () => {
    const msg = montarAvisoMudanca(
      { data: HOJE, hora: '10:00' },
      { ...reuniao, data: '2026-10-13', hora: '10:00' },
      null,
      HOJE,
      AMANHA,
    )
    expect(msg?.corpo).toBe('Agora: 13/10 às 10:00 (antes: hoje às 10:00)')
  })

  it('evento novo pra amanhã avisa; pra daqui a uma semana não', () => {
    expect(montarAvisoMudanca(null, { ...reuniao, data: AMANHA, hora: null }, null, HOJE, AMANHA)).toMatchObject({
      titulo: 'Novo compromisso amanhã: Reunião — Pais 7º A',
      corpo: 'amanhã',
    })
    expect(montarAvisoMudanca(null, { ...reuniao, data: '2026-10-13', hora: null }, null, HOJE, AMANHA)).toBeNull()
  })

  it('mudança longe de hoje/amanhã, sem mudar data/hora ou já concluído não avisa', () => {
    const longe = montarAvisoMudanca(
      { data: '2026-10-20', hora: '10:00' },
      { ...reuniao, data: '2026-10-21', hora: '10:00' },
      null,
      HOJE,
      AMANHA,
    )
    const soTitulo = montarAvisoMudanca({ data: HOJE, hora: '10:00' }, { ...reuniao, data: HOJE, hora: '10:00' }, null, HOJE, AMANHA)
    const concluido = montarAvisoMudanca(
      { data: HOJE, hora: '10:00' },
      { ...reuniao, concluido: true, data: HOJE, hora: '11:00' },
      null,
      HOJE,
      AMANHA,
    )
    expect([longe, soTitulo, concluido]).toEqual([null, null, null])
  })
})
