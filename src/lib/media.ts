import type { Avaliacao, ConfigCalculo, MapaDeNotas } from '../types'

export function chaveNota(alunoId: string, avaliacaoId: string): string {
  return `${alunoId}::${avaliacaoId}`
}

// Calcula a média de um aluno considerando o modelo configurado na turma.
// Avaliações sem nota lançada (null) são ignoradas no cálculo.
export function calcularMedia(
  alunoId: string,
  avaliacoes: Avaliacao[],
  notas: MapaDeNotas,
  modelo: ConfigCalculo['modelo'],
): number | null {
  const lancadas = avaliacoes
    .map((a) => ({
      peso: a.peso,
      valor: notas[chaveNota(alunoId, a.id)],
    }))
    .filter((n): n is { peso: number; valor: number } => typeof n.valor === 'number')

  if (lancadas.length === 0) return null

  if (modelo === 'ponderada') {
    const somaPesos = lancadas.reduce((s, n) => s + n.peso, 0)
    if (somaPesos === 0) return null
    const somaProd = lancadas.reduce((s, n) => s + n.valor * n.peso, 0)
    return arredondar(somaProd / somaPesos)
  }

  // média simples
  const soma = lancadas.reduce((s, n) => s + n.valor, 0)
  return arredondar(soma / lancadas.length)
}

export function arredondar(valor: number, casas = 1): number {
  const fator = 10 ** casas
  return Math.round(valor * fator) / fator
}

// Formata número no padrão brasileiro (vírgula decimal); "—" quando vazio
export function formatarNota(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return '—'
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

export type SituacaoAluno = 'aprovado' | 'recuperacao' | 'sem-nota'

export function situacao(
  media: number | null,
  mediaAprovacao: number,
): SituacaoAluno {
  if (media == null) return 'sem-nota'
  return media >= mediaAprovacao ? 'aprovado' : 'recuperacao'
}
