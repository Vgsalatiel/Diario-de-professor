// Modelos de dados do sistema

export interface Professora {
  id: string
  nome: string
  email: string
  materias: string[]
  fotoUrl?: string
  emailVerificado: boolean
  isAdmin: boolean
}

// Um professor visto pela conta de diretor(a) — resumo pra tela de administração.
export interface ProfessorResumo {
  id: string
  nome: string
  email: string
  materias: string[]
  isAdmin: boolean
  criadoEm: string
  totalTurmas: number
}

// Cada escola tem seu próprio jeito de dividir o ano letivo
export type SistemaPeriodo = 'bimestre' | 'trimestre' | 'semestre'

// Etapa de ensino no vocabulário da BNCC — usada só pra filtrar habilidades
// no Assistente de planejamento contextual (ver PlanoDeAula).
export type EtapaBncc = 'fundamental' | 'medio'

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
  disciplina?: string | null // componente curricular fixo da turma, ex.: "Matemática"
  etapaBncc?: EtapaBncc | null
  anoSerieBncc?: number | null // 1-9 no Fundamental, 1-3 no Médio
}

// Uma habilidade da BNCC (código + descrição reais, nunca inventados —
// vêm sempre da base embarcada no backend).
export interface HabilidadeBncc {
  codigo: string
  texto: string
  componente: string
  etapa: EtapaBncc
  anos: number[]
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

// Dia sem aula pra toda a escola (feriado, recesso, ponto facultativo) —
// marcado na Agenda, vale pra todas as turmas, ao contrário do "sem aula"
// da tela de Frequência (que é só de uma turma numa data).
export interface Feriado {
  id: string | null // null = feriado nacional calculado, não dá pra excluir
  data: string // ISO: "2026-09-07"
  titulo: string
  origemAutomatica: boolean
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

// Uma aula planejada dentro do cronograma de um plano — gerado pelo
// Assistente de planejamento contextual, cobrindo o período inteiro do
// plano (não uma aula avulsa). habilidadeCodigo sempre vem validado contra
// a base real da BNCC, nunca inventado pela IA.
export interface CronogramaItem {
  numero: number
  data: string // ISO
  habilidadeCodigo: string
  habilidadeTexto: string
  subtema: string
  resumo: string
}

export interface PlanoDeAula {
  id: string
  turmaId: string
  titulo: string
  duracao: DuracaoPlano
  dataInicio: string // ISO
  dataFim: string // ISO — até quando esse plano vale
  conteudo?: string // tópicos/conteúdo previsto
  criadoEm: string // ISO datetime — usado pra ordenar os cards por ordem de criação
  cronograma?: CronogramaItem[] | null // gerado pelo Assistente de planejamento contextual
}

// "O que foi aplicado no dia" — um resumo por turma+data, mostrado no
// botão "Aula deste dia" da tela de Frequência.
export interface RegistroAula {
  id: string
  turmaId: string
  data: string // ISO
  resumo: string
  planoId?: string // plano de aula ao qual esse dia pertence, se houver
  // Confirmado pelo professor: qual item do cronograma do plano essa aula
  // corresponde. bnccCodigo/bnccTexto são uma cópia congelada no momento
  // da confirmação (o cronograma do plano pode mudar depois).
  planoItemNumero?: number | null
  bnccCodigo?: string | null
  bnccTexto?: string | null
}
