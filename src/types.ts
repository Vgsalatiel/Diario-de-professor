// Modelos de dados do sistema

export interface Professora {
  id: string
  nome: string
  email: string
  materia: string
  fotoUrl?: string
  emailVerificado: boolean
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
  // Dias da semana em que há aula dessa turma — 0=domingo .. 6=sábado
  diasAula: number[]
}

// Situação da matrícula do aluno na turma
export type SituacaoMatricula = 'ativo' | 'inativo' | 'transferido'

export interface Aluno {
  id: string
  turmaId: string
  nome: string
  telefonePais?: string
  email?: string
  matricula?: string
  dataNascimento?: string // ISO: "2012-05-20"
  situacao: SituacaoMatricula
  dificuldades?: string // observação livre: dificuldades/facilidades do aluno
}

// Uma lista de exercícios que o Assistente IA gerou pra um aluno específico.
export interface ExercicioGerado {
  id: string
  alunoId: string
  titulo: string
  assunto: string
  dificuldade?: string
  questoes: { enunciado: string; gabarito: string }[]
  criadoEm: string // ISO datetime
  nomeProva?: string
  dataProva?: string // ISO: "2026-10-15"
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
  planoId?: string // quando é uma prova criada de dentro de um plano de aula
  conteudo?: string
  concluido?: boolean
  prazo?: string // ISO — prazo de entrega, usado em eventos do tipo "trabalho"/atividade
}

// Notas ficam num mapa plano: chave = `${alunoId}::${avaliacaoId}`
export type MapaDeNotas = Record<string, number | null>

// Uma data de aula dentro de uma turma — cada uma vira uma coluna de chamada
export interface DataAula {
  id: string
  turmaId: string
  data: string // ISO: "2026-09-15"
  periodo: Periodo
  semAula?: boolean // dia marcado como "não houve aula" — não conta na frequência
}

// Frequência num mapa plano: chave = `${alunoId}::${dataAulaId}`
// true = presente, false = falta, ausência de chave = ainda não lançado
export type MapaDeFrequencia = Record<string, boolean | null>

// Duração que o professor escolhe pro plano — em todos os casos ele
// decide também a data final ("até quando" vale o plano).
export type DuracaoPlano = 'quinzenal' | 'semestral' | 'personalizado'

export interface PlanoDeAula {
  id: string
  turmaId: string
  titulo: string
  duracao: DuracaoPlano
  dataInicio: string // ISO
  dataFim: string // ISO — até quando esse plano vale
  conteudo?: string // tópicos/conteúdo previsto
}

// "O que foi aplicado no dia" — um resumo por turma+data, mostrado no
// botão "Aula deste dia" da tela de Frequência.
export interface RegistroAula {
  id: string
  turmaId: string
  data: string // ISO
  resumo: string
  planoId?: string // plano de aula ao qual esse dia pertence, se houver
}
