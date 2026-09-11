import type { TipoEvento } from '../types'

export function rotuloTipo(tipo: TipoEvento): string {
  switch (tipo) {
    case 'prova':
      return 'Prova'
    case 'trabalho':
      return 'Trabalho'
    case 'reuniao':
      return 'Reunião'
    default:
      return 'Outro'
  }
}

export function corTipo(tipo: TipoEvento): string {
  switch (tipo) {
    case 'prova':
      return '#4759a8'
    case 'trabalho':
      return '#2f9e6b'
    case 'reuniao':
      return '#e8a33d'
    default:
      return '#6b7280'
  }
}

// "2026-09-15" -> "15/09/2026"
export function formatarData(iso: string): string {
  if (!iso) return ''
  const [ano, mes, dia] = iso.split('-')
  if (!ano || !mes || !dia) return iso
  return `${dia}/${mes}/${ano}`
}
