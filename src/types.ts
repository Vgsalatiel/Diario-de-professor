// Modelos de dados do sistema

export interface Professora {
  id: string
  nome: string
  email: string
  senha: string // simulado — em produção nunca guarde senha em texto puro
  materia: string
  fotoUrl?: string
}

// Cada escola tem seu próprio jeito de dividir o ano letivo
export type SistemaPeriodo = 'bimestre' | 'trimestre' | 'semestre'

export interface Turma {
  id: string
  nome: string // ex.: "9º Ano A"
  serie: string // ex.: "Ensino Fundamental II"
  anoLetivo: string // ex.: "2026"
  escola: string // nome da escola — útil para quem dá aula em mais de uma
  sistemaPeriodo: SistemaPeriodo // como essa escola divide o ano: bimestre ou semestre
  cor: string // cor de identificação da turma
}

export interface Aluno {
  id: string
  turmaId: string
  nome: string
  telefonePais?: string
  email?: string
}

// Número do período dentro do ano letivo: "1"/"2" (semestre) ou "1".."4" (bimestre)
export type Periodo = '1' | '2' | '3' | '4'

// Uma coluna de avaliação dentro de uma turma (Prova 1, Trabalho, etc.)
export interface Avaliacao {
  id: string
  turmaId: string
  nome: string
  peso: number // usado no cálculo ponderado
  periodo: Periodo
}

export type ModeloCalculo = 'simples' | 'ponderada'

// Configuração de como a média é calculada em cada turma
export interface ConfigCalculo {
  turmaId: string
  modelo: ModeloCalculo
  mediaAprovacao: number
}

export type TipoEvento = 'prova' | 'trabalho' | 'reuniao' | 'outro'

export interface Evento {
  id: string
  titulo: string
  tipo: TipoEvento
  data: string // ISO: "2026-09-15"
  hora?: string // "10:00"
  turmaId?: string
  conteudo?: string
}

// Notas ficam num mapa plano: chave = `${alunoId}::${avaliacaoId}`
export type MapaDeNotas = Record<string, number | null>

// Uma data de aula dentro de uma turma — cada uma vira uma coluna de chamada
export interface DataAula {
  id: string
  turmaId: string
  data: string // ISO: "2026-09-15"
  periodo: Periodo
}

// Frequência num mapa plano: chave = `${alunoId}::${dataAulaId}`
// true = presente, false = falta, ausência de chave = ainda não lançado
export type MapaDeFrequencia = Record<string, boolean | null>
