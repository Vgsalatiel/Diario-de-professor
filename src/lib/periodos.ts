import type { Periodo, SistemaPeriodo, Turma } from '../types'

interface OpcaoPeriodo {
  valor: Periodo
  rotulo: string
}

const BIMESTRES: OpcaoPeriodo[] = [
  { valor: '1', rotulo: '1º Bimestre' },
  { valor: '2', rotulo: '2º Bimestre' },
  { valor: '3', rotulo: '3º Bimestre' },
  { valor: '4', rotulo: '4º Bimestre' },
]

const TRIMESTRES: OpcaoPeriodo[] = [
  { valor: '1', rotulo: '1º Trimestre' },
  { valor: '2', rotulo: '2º Trimestre' },
  { valor: '3', rotulo: '3º Trimestre' },
]

const SEMESTRES: OpcaoPeriodo[] = [
  { valor: '1', rotulo: '1º Semestre' },
  { valor: '2', rotulo: '2º Semestre' },
]

export function opcoesPeriodo(sistema: SistemaPeriodo): OpcaoPeriodo[] {
  if (sistema === 'bimestre') return BIMESTRES
  if (sistema === 'trimestre') return TRIMESTRES
  return SEMESTRES
}

export function rotuloSistema(sistema: SistemaPeriodo): string {
  if (sistema === 'bimestre') return 'Bimestre'
  if (sistema === 'trimestre') return 'Trimestre'
  return 'Semestre'
}

// Turma inicial consistente com a escola que fica ativa por padrão
// (a primeira em ordem alfabética, quando há mais de uma escola).
export function turmaInicial(turmas: Turma[]): string {
  const escolas = Array.from(new Set(turmas.map((t) => t.escola).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b),
  )
  if (escolas.length > 1) {
    const turma = turmas.find((t) => t.escola === escolas[0])
    if (turma) return turma.id
  }
  return turmas[0]?.id ?? ''
}
