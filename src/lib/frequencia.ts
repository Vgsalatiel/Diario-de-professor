import type { DataAula, MapaDeFrequencia } from '../types'

export function chavePresenca(alunoId: string, dataAulaId: string): string {
  return `${alunoId}::${dataAulaId}`
}

export interface ResumoFrequencia {
  presencas: number
  faltas: number
  total: number
  percentual: number | null // null quando nenhuma aula foi lançada ainda
}

// Considera só as aulas com presença/falta já registrada — uma aula
// recém-criada não conta contra o aluno antes de ser marcada. Dias
// marcados como "sem aula" são ignorados por completo, mesmo que já
// tenham alguma presença/falta lançada.
export function calcularFrequencia(
  alunoId: string,
  datasAula: DataAula[],
  frequencia: MapaDeFrequencia,
): ResumoFrequencia {
  let presencas = 0
  let faltas = 0
  for (const d of datasAula) {
    if (d.semAula) continue
    const v = frequencia[chavePresenca(alunoId, d.id)]
    if (v === true) presencas++
    else if (v === false) faltas++
  }
  const total = presencas + faltas
  return {
    presencas,
    faltas,
    total,
    percentual: total === 0 ? null : Math.round((presencas / total) * 100),
  }
}

// Primeiro clique marca presença; a partir daí alterna presença ↔ falta.
export function proximoEstado(atual: boolean | null | undefined): boolean {
  return atual === true ? false : true
}
