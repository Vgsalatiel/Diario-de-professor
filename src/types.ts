// Modelos de dados do sistema

export interface Professora {
  id: string
  nome: string
  email: string
  materias: string[]
  fotoUrl?: string
  emailVerificado: boolean
  isAdmin: boolean
  isCoordenador: boolean
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
  aulasRegistradasHoje: number
  pendencias: number
}

// Turma vista pela coordenação pedagógica — mesmo formato de
// TurmaResumoAdmin, mais a média geral de notas (que o diretor não vê).
// Tendência de desempenho da turma — calculada por regra fixa (últimas 3
// avaliações lançadas em sequência consistente), não por IA. O sistema só
// mostra o dado; quem decide se é um problema é a coordenação.
export interface TendenciaDesempenho {
  direcao: 'queda' | 'alta'
  texto: string
}

export interface TurmaResumoCoordenacao extends TurmaResumoAdmin {
  mediaTurma: number | null
  tendencia: TendenciaDesempenho | null
}

// Plano de aula resumido, visto pela coordenação (sem o cronograma inteiro).
export interface PlanoResumoCoordenacao {
  id: string
  titulo: string
  dataInicio: string
  dataFim: string
  turmaNome: string
}

// Aluno com dificuldade registrada, visto pela coordenação.
export interface AlunoDificuldadeCoordenacao {
  id: string
  nome: string
  dificuldades: string | null
  turmaNome?: string
}

// "comentario" é só uma nota; "solicitacaoCorrecao" é um pedido concreto
// de ajuste que o professor marca como resolvido quando atender — a
// coordenação acompanha e comenta, não edita o trabalho do professor.
export type TipoObservacao = 'comentario' | 'solicitacaoCorrecao'

export interface ObservacaoPedagogica {
  id: string
  texto: string
  tipo: TipoObservacao
  resolvida: boolean
  criadoEm: string
  autorNome: string
  professorAlvoNome?: string | null
  turmaNome: string | null
}

// Entrada da linha do tempo pedagógica de um aluno — diferente de
// "dificuldades" (nota única que qualquer edição substitui), cada uma
// dessas fica registrada pra sempre.
export interface AcompanhamentoAluno {
  id: string
  texto: string
  criadoEm: string
  autorNome: string
}

// Média do aluno numa matéria — "matéria" aqui é o campo disciplina da
// turma (ou o nome dela, se a disciplina não tiver sido definida).
export interface DesempenhoMateria {
  turmaId: string
  materia: string
  media: number | null
}

// Detalhe individual do aluno, visto pela coordenação — agrega as
// matrículas do mesmo aluno (mesmo nome, escola e ano letivo) em turmas
// diferentes, já que cada turma aqui é uma disciplina/professor.
export interface AlunoDetalheCoordenacao {
  id: string
  nome: string
  situacao: SituacaoMatricula
  turmaNome: string
  frequenciaPercentual: number | null
  desempenho: DesempenhoMateria[]
  dificuldades: string | null
  acompanhamentos: AcompanhamentoAluno[]
}

// Um professor na tabela "Professores" da coordenação — turmas, quantas
// aulas já dadas tiveram o resumo registrado (X/Y) e o semáforo disso.
export interface ProfessorResumoCoordenacao {
  id: string
  nome: string
  email: string
  materias: string[]
  turmasNomes: string[]
  registrosFeitos: number
  registrosEsperados: number
  situacaoRegistro: 'boa' | 'atencao' | 'critica' | 'semDados'
}

// Proporção "feito/esperado" de um tipo de registro (aulas, frequência ou
// avaliações) de um professor — usada no detalhe pedagógico dele.
export interface ProporcaoRegistro {
  feitas: number
  esperadas: number
}

// Detalhe pedagógico de um professor, visto pela coordenação.
export interface ProfessorDetalheCoordenacao {
  id: string
  nome: string
  email: string
  materias: string[]
  criadoEm: string
  turmas: { id: string; nome: string }[]
  registros: {
    aulas: ProporcaoRegistro
    frequencia: ProporcaoRegistro
    avaliacoes: ProporcaoRegistro
  }
  pendencias: string[]
  planosDeAula: PlanoResumoCoordenacao[]
  alunosComDificuldade: AlunoDificuldadeCoordenacao[]
  observacoes: ObservacaoPedagogica[]
}

// Um aluno dentro do detalhe de turma da coordenação — inclui a própria
// frequência, já que a tela de turma cobre a frente "Frequência" também.
export interface AlunoDaTurmaCoordenacao {
  id: string
  nome: string
  situacao: SituacaoMatricula
  dificuldades: string | null
  frequenciaPercentual: number | null
}

// Prova/trabalho da turma, visto pela coordenação (seção "Atividades").
export interface AtividadeTurmaCoordenacao {
  id: string
  titulo: string
  tipo: TipoEvento
  data: string
  concluido: boolean
}

// Detalhe pedagógico de uma turma, visto pela coordenação — as 7 frentes:
// Alunos, Frequência, Avaliações, Aulas, Professor(es), Atividades e
// Observações.
export interface TurmaDetalheCoordenacao {
  id: string
  nome: string
  serie: string
  turno: Turno | null
  escola: string
  anoLetivo: string
  professores: { id: string; nome: string; email: string; materias: string[]; disciplina: string }[]
  totalAlunos: number
  frequenciaMedia: number | null
  mediaTurma: number | null
  alunos: AlunoDaTurmaCoordenacao[]
  mediasPorAvaliacao: { id: string; nome: string; mediaTurma: number | null; totalLancadas: number }[]
  tendencia: TendenciaDesempenho | null
  aulasRecentes: { data: string | null; resumo: string }[]
  planoAtivo: { id: string; titulo: string; dataInicio: string; dataFim: string } | null
  atividades: AtividadeTurmaCoordenacao[]
  observacoes: ObservacaoPedagogica[]
}

// Evento visto pela coordenação — de qualquer professor/turma da escola.
export interface EventoEscola {
  id: string
  titulo: string
  tipo: TipoEvento
  data: string
  hora: string | null
  concluido: boolean
  turmaNome: string | null
  professorNome: string
  totalEncaminhamentos: number
  encaminhamentosAbertos: number
}

// Item de ação combinado numa reunião pedagógica — "Professor João revisar
// atividade" etc. — que a coordenação acompanha até ficar concluído.
export interface Encaminhamento {
  id: string
  texto: string
  concluido: boolean
  criadoEm: string
  responsavelId: string | null
  responsavelNome: string | null
}

// Detalhe completo de uma reunião pedagógica — pauta, participantes, ata
// e os encaminhamentos combinados.
export interface ReuniaoDetalhe {
  id: string
  titulo: string
  data: string
  hora: string | null
  conteudo: string | null
  concluido: boolean
  turmaNome: string | null
  professorNome: string
  pauta: string[]
  participantes: string[]
  ata: string | null
  encaminhamentos: Encaminhamento[]
}

// Turma vista pelo painel do(a) diretor(a) — todas as turmas da escola,
// não só as do professor logado.
// Um professor+disciplina, na forma resumida usada pelas telas de
// Admin/Coordenação (cartão de turma, badges).
export interface ProfessorResumoNaTurma {
  professorId: string
  professorNome: string
  disciplina: string
}

export interface TurmaResumoAdmin {
  id: string
  nome: string
  serie: string
  turno: Turno | null
  escola: string
  anoLetivo: string
  professores: ProfessorResumoNaTurma[]
  totalAlunos: number
  frequenciaMedia: number | null
  aulaRegistradaHoje: boolean
  semRegistroOntem: boolean
  avaliacaoPendente: boolean
}

// Aluno visto pelo painel do(a) diretor(a) — todos os alunos da escola.
export interface AlunoResumoAdmin {
  id: string
  nome: string
  situacao: SituacaoMatricula
  turmaNome: string
  escola: string
  professorNome: string
  frequenciaPercentual: number | null
}

// Números da escola inteira — pro(a) diretor(a) enxergar "quantos alunos
// precisam de atenção" sem abrir a lista completa de 486 nomes.
export interface ResumoAlunosEscola {
  total: number
  ativos: number
  transferidos: number
  inativos: number
  baixaFrequencia: number
  comAcompanhamento: number
}

// Cada escola tem seu próprio jeito de dividir o ano letivo
export type SistemaPeriodo = 'bimestre' | 'trimestre' | 'semestre'

// Etapa de ensino no vocabulário da BNCC — usada só pra filtrar habilidades
// no Assistente de planejamento contextual (ver PlanoDeAula).
export type EtapaBncc = 'fundamental' | 'medio'

// Turno em que a turma acontece — a mesma escola pode repetir "9º Ano A"
// de manhã e à tarde, com professores diferentes.
export type Turno = 'manha' | 'tarde' | 'noite'

// Um professor atribuído a uma turma, com a disciplina que ele dá ali —
// uma turma tem vários (um por disciplina), todos dando aula pro mesmo
// grupo de alunos.
export interface ProfessorDaTurma {
  professorId: string
  disciplina: string
}

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
  etapaBncc?: EtapaBncc | null
  anoSerieBncc?: number | null // 1-9 no Fundamental, 1-3 no Médio
  turno?: Turno | null
  // Todos os professores atribuídos a essa turma (coordenação/diretor vê
  // a lista inteira; GET /turmas do professor logado também manda, mas
  // "config" abaixo já vem resolvido pra ele mesmo).
  professores: ProfessorDaTurma[]
  // Presentes só na resposta de GET /turmas (visão do professor logado):
  // a disciplina/config dele mesmo nessa turma, já resolvidos, pra não
  // obrigar a tela a filtrar "professores" pra achar o próprio.
  disciplina?: string | null
  config?: ConfigCalculo
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

// Nota numérica (0-10, com média) ou conceito (texto livre, sem média) —
// escolhido por turma, nunca os dois ao mesmo tempo.
export type TipoAvaliacao = 'nota' | 'conceito'

// Opções de conceito oferecidas quando a turma usa esse modo — mesma
// lista no frontend e usada como referência ao exportar/mostrar.
// A = nota máxima ... D = nota baixa/reprovado.
export const OPCOES_CONCEITO = ['A', 'B', 'C', 'D'] as const

// Configuração de como a média é calculada em cada turma — agora por
// professor/disciplina dentro da turma, já que uma turma tem vários.
export interface ConfigCalculo {
  turmaId: string
  professorId: string
  modelo: ModeloCalculo
  mediaAprovacao: number
  tipoAvaliacao: TipoAvaliacao
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

// Uma questão gerada por IA (mesma forma usada tanto no Assistente de
// exercícios personalizados quanto nas sugestões de atividade/prova do
// Assistente de planejamento contextual).
export interface QuestaoGerada {
  enunciado: string
  gabarito: string
}

// Sugestão de atividade ou prova pronta (com questões), gerada junto com
// o cronograma — o professor decide se aceita antes de virar avaliação
// de verdade.
export interface SugestaoAvaliacao {
  titulo: string
  questoes: QuestaoGerada[]
  data: string // ISO — data sugerida, dentro do período do plano
}

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
  // Dono do evento — normalmente sou eu mesmo, mas pode ser a coordenação
  // pedagógica marcando uma reunião numa turma minha. Só o dono edita/exclui.
  professorId: string
}

// Notas ficam num mapa plano: chave = `${alunoId}::${avaliacaoId}`
export type MapaDeNotas = Record<string, number | null>
// Mesma ideia, só que pras turmas que usam conceito em vez de nota.
export type MapaDeConceitos = Record<string, string | null>

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

// Situação da entrega de uma prova/atividade (Evento) por aluno.
export type StatusEntrega = 'pendente' | 'feito' | 'naoEntregou'

// Entregas num mapa plano: chave = `${alunoId}::${eventoId}`, ausência de
// chave = "pendente" (ainda não marcado).
export type MapaDeEntregas = Record<string, StatusEntrega | undefined>

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
