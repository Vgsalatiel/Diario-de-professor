import { describe, expect, it } from 'vitest'
import { dataISO } from './validators'
import { definirNotaDto } from '../modules/notas/notas.dto'
import { atualizarEventoDto, criarEventoDto } from '../modules/eventos/eventos.dto'
import { gerarPlanoIaDto } from '../modules/planos/planos.dto'
import { definirRegistroAulaDto } from '../modules/registrosAula/registrosAula.dto'

describe('dataISO', () => {
  it('aceita só datas que existem', () => {
    expect(dataISO().safeParse('2026-10-02').success).toBe(true)
    expect(dataISO().safeParse('2028-02-29').success).toBe(true)
    expect(dataISO().safeParse('2026-02-30').success).toBe(false)
    expect(dataISO().safeParse('2026-99-99').success).toBe(false)
    expect(dataISO().safeParse('02/10/2026').success).toBe(false)
  })
})

describe('definirNotaDto', () => {
  it('não aceita nota e conceito juntos', () => {
    expect(definirNotaDto.safeParse({ valor: 7, conceito: 'A' }).success).toBe(false)
  })

  it('conceito só A–D; nota de 0 a 10', () => {
    expect(definirNotaDto.safeParse({ conceito: 'B' }).success).toBe(true)
    expect(definirNotaDto.safeParse({ conceito: 'Z' }).success).toBe(false)
    expect(definirNotaDto.safeParse({ valor: 10.5 }).success).toBe(false)
    expect(definirNotaDto.safeParse({ valor: null }).success).toBe(true)
  })
})

describe('eventos', () => {
  it('campo vazio vira null (apagar) e ausente fica de fora', () => {
    expect(atualizarEventoDto.parse({ hora: '', turmaId: '', prazo: null })).toEqual({ hora: null, turmaId: null, prazo: null })
    expect(atualizarEventoDto.parse({ titulo: 'x' })).toEqual({ titulo: 'x' })
  })

  it('recusa horário em formato errado', () => {
    expect(criarEventoDto.safeParse({ titulo: 'x', tipo: 'prova', data: '2026-10-02', hora: '25h' }).success).toBe(false)
  })
})

describe('conteúdo rico é limpo ao salvar', () => {
  it('remove script e atributos de evento', () => {
    const { resumo } = definirRegistroAulaDto.parse({
      data: '2026-10-01',
      resumo: '<p>Aula <strong>boa</strong><img src=x onerror=alert(1)></p><script>x()</script>',
    })
    expect(resumo).toBe('<p>Aula <strong>boa</strong></p>')
  })
})

describe('gerarPlanoIaDto', () => {
  it('limita o tamanho do tema', () => {
    expect(gerarPlanoIaDto.safeParse({ temaGeral: 'a'.repeat(301), dataInicio: '2026-01-01', dataFim: '2026-02-01' }).success).toBe(false)
  })
})
