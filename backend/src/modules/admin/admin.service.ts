import { prisma } from '../../lib/prisma'
import { AppError } from '../../utils/AppError'
import { hojeNoBrasil } from '../../utils/serializers'
import { feriadosNacionais } from '../../lib/feriadosNacionais'

function diaAnterior(dataISO: string): string {
  const d = new Date(`${dataISO}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// diasAula usa 0=domingo..6=sábado (mesma convenção do resto do app).
function diaDaSemana(dataISO: string): number {
  return new Date(`${dataISO}T00:00:00.000Z`).getUTCDay()
}

function ehFeriadoNacional(dataISO: string): boolean {
  const ano = Number(dataISO.slice(0, 4))
  return feriadosNacionais(ano).some((f) => f.data === dataISO)
}

// Abaixo desse percentual de presença, o aluno entra na contagem de
// "baixa frequência" — mesmo corte usado na tela de Frequência (pill
// verde/vermelho) pra o indicador da escola bater com o que o professor
// já vê na própria turma.
export const LIMIAR_BAIXA_FREQUENCIA = 75

// "Registro em dia" = tem resumo da aula (RegistroAula) pra cada data em
// que a chamada foi feita (DataAula, ignorando dias marcados "sem aula").
// Mesma regra usada na tabela "Professores" da coordenação — serve de
// proxy honesto pra "professor está documentando as aulas que dá".
function situacaoRegistro(feitas: number, esperadas: number): 'boa' | 'atencao' | 'critica' | 'semDados' {
  if (esperadas === 0) return 'semDados'
  const proporcao = feitas / esperadas
  if (proporcao >= 0.9) return 'boa'
  if (proporcao >= 0.5) return 'atencao'
  return 'critica'
}

// Frequência de cada aluno ativo da escola inteira, ignorando dias
// marcados como "sem aula" — mesma regra de src/lib/frequencia.ts no
// frontend, só que agregada pra todas as turmas de uma vez.
export async function calcularFrequenciaPorAluno(): Promise<Map<string, number>> {
  const registros = await prisma.frequencia.findMany({
    where: {
      presente: { not: null },
      dataAula: { semAula: false, turma: { excluidoEm: null } },
      aluno: { excluidoEm: null, situacao: 'ativo' },
    },
    select: { alunoId: true, presente: true },
  })

  const porAluno = new Map<string, { presencas: number; total: number }>()
  for (const r of registros) {
    const atual = porAluno.get(r.alunoId) ?? { presencas: 0, total: 0 }
    atual.total++
    if (r.presente) atual.presencas++
    porAluno.set(r.alunoId, atual)
  }

  const percentuais = new Map<string, number>()
  for (const [alunoId, { presencas, total }] of porAluno) {
    percentuais.set(alunoId, Math.round((presencas / total) * 100))
  }
  return percentuais
}

// Pares "turmaId:professorId" — uma turma agora pode ter vários
// professores (um por disciplina), então uma pendência é sempre de um
// professor específico dentro da turma, nunca da turma como um todo.
// idsDosPares() reduz de volta pra turma quando só interessa "essa turma
// tem alguma pendência" (ex.: pill no card da turma).
function idsDosPares(pares: Set<string>): Set<string> {
  return new Set(Array.from(pares, (par) => par.split(':')[0]))
}

// Pares sem registro da aula de ontem: a turma tinha aula prevista ontem
// (pelo dia da semana) e esse professor especificamente não registrou o
// resumo (RegistroAula já é por turma+professor+data).
async function paresSemRegistroOntem(anoAtual: string): Promise<Set<string>> {
  const hoje = hojeNoBrasil()
  const ontem = diaAnterior(hoje)
  if (ehFeriadoNacional(ontem)) return new Set()

  const weekdayOntem = diaDaSemana(ontem)
  const turmasComAulaOntem = await prisma.turma.findMany({
    where: { excluidoEm: null, anoLetivo: anoAtual, diasAula: { has: weekdayOntem } },
    select: { id: true, professores: { select: { professorId: true } } },
  })
  if (turmasComAulaOntem.length === 0) return new Set()

  const idsComAulaOntem = turmasComAulaOntem.map((t) => t.id)
  const registrosOntem = await prisma.registroAula.findMany({
    where: { turmaId: { in: idsComAulaOntem }, data: new Date(`${ontem}T00:00:00.000Z`) },
    select: { turmaId: true, professorId: true },
  })
  const comRegistro = new Set(registrosOntem.map((r) => `${r.turmaId}:${r.professorId}`))

  const semRegistro = new Set<string>()
  for (const t of turmasComAulaOntem) {
    for (const p of t.professores) {
      const chave = `${t.id}:${p.professorId}`
      if (!comRegistro.has(chave)) semRegistro.add(chave)
    }
  }
  return semRegistro
}

// Pares com alguma avaliação sem nenhuma nota lançada — Avaliacao já
// carrega professorId direto, então nem precisa passar por TurmaProfessor.
async function paresComAvaliacaoPendente(): Promise<Set<string>> {
  const avaliacoes = await prisma.avaliacao.findMany({
    where: { turma: { excluidoEm: null }, notas: { none: { valor: { not: null } } } },
    select: { turmaId: true, professorId: true },
  })
  return new Set(avaliacoes.map((a) => `${a.turmaId}:${a.professorId}`))
}

// Pares com o resumo da aula de hoje já registrado.
async function paresComAulaRegistradaHoje(): Promise<Set<string>> {
  const hoje = hojeNoBrasil()
  const registros = await prisma.registroAula.findMany({
    where: { data: new Date(`${hoje}T00:00:00.000Z`), turma: { excluidoEm: null } },
    select: { turmaId: true, professorId: true },
  })
  return new Set(registros.map((r) => `${r.turmaId}:${r.professorId}`))
}

// Base compartilhada pelas telas de Turmas e Professores (e reaproveitada
// pelo módulo de coordenação) — evita calcular a mesma coisa (frequência
// por turma, pendências) duas vezes.
export async function obterTurmasComMetricas() {
  const anoAtual = hojeNoBrasil().slice(0, 4)
  const hoje = hojeNoBrasil()

  const [turmas, alunosAtivos, percentuaisPorAluno, paresSemRegistro, paresAvaliacaoPendente, paresAulaHoje] =
    await Promise.all([
      prisma.turma.findMany({
        where: { excluidoEm: null },
        select: {
          id: true,
          nome: true,
          serie: true,
          turno: true,
          escola: true,
          anoLetivo: true,
          professores: {
            select: { professorId: true, disciplina: true, professor: { select: { nome: true } } },
          },
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.aluno.findMany({
        where: { excluidoEm: null, situacao: 'ativo' },
        select: { id: true, turmaId: true },
      }),
      calcularFrequenciaPorAluno(),
      paresSemRegistroOntem(anoAtual),
      paresComAvaliacaoPendente(),
      paresComAulaRegistradaHoje(),
    ])

  const idsSemRegistroOntem = idsDosPares(paresSemRegistro)
  const idsAvaliacaoPendente = idsDosPares(paresAvaliacaoPendente)
  const idsComAulaRegistradaHoje = idsDosPares(paresAulaHoje)

  const alunosPorTurma = new Map<string, string[]>()
  for (const a of alunosAtivos) {
    const arr = alunosPorTurma.get(a.turmaId) ?? []
    arr.push(a.id)
    alunosPorTurma.set(a.turmaId, arr)
  }

  return turmas.map((t) => {
    const alunoIds = alunosPorTurma.get(t.id) ?? []
    const percentuaisDaTurma = alunoIds
      .map((id) => percentuaisPorAluno.get(id))
      .filter((v): v is number => v != null)
    const frequenciaMedia =
      percentuaisDaTurma.length > 0
        ? Math.round(percentuaisDaTurma.reduce((a, b) => a + b, 0) / percentuaisDaTurma.length)
        : null

    return {
      id: t.id,
      nome: t.nome,
      serie: t.serie,
      turno: t.turno,
      escola: t.escola,
      anoLetivo: t.anoLetivo,
      professores: t.professores.map((p) => ({
        professorId: p.professorId,
        professorNome: p.professor.nome,
        disciplina: p.disciplina,
      })),
      totalAlunos: alunoIds.length,
      frequenciaMedia,
      aulaRegistradaHoje: idsComAulaRegistradaHoje.has(t.id),
      semRegistroOntem: idsSemRegistroOntem.has(t.id),
      avaliacaoPendente: idsAvaliacaoPendente.has(t.id),
    }
  })
}

export async function obterDashboard() {
  const hoje = hojeNoBrasil()
  const anoAtual = hoje.slice(0, 4)
  const weekdayHoje = diaDaSemana(hoje)
  const hojeEhFeriado = ehFeriadoNacional(hoje)

  const [
    totalProfessores,
    totalTurmas,
    totalAlunos,
    percentuaisPorAluno,
    paresSemRegistro,
    paresAvaliacaoPendente,
    aulasRegistradasHoje,
  ] = await Promise.all([
    prisma.professor.count(),
    prisma.turma.count({ where: { excluidoEm: null } }),
    prisma.aluno.count({ where: { excluidoEm: null, turma: { excluidoEm: null } } }),
    calcularFrequenciaPorAluno(),
    paresSemRegistroOntem(anoAtual),
    paresComAvaliacaoPendente(),
    prisma.registroAula.count({
      where: { data: new Date(`${hoje}T00:00:00.000Z`), turma: { excluidoEm: null } },
    }),
  ])

  const idsSemRegistroOntem = idsDosPares(paresSemRegistro)
  const idsAvaliacaoPendente = idsDosPares(paresAvaliacaoPendente)

  const percentuais = Array.from(percentuaisPorAluno.values())
  const frequenciaMedia =
    percentuais.length > 0 ? Math.round(percentuais.reduce((a, b) => a + b, 0) / percentuais.length) : null
  const alunosComBaixaFrequencia = percentuais.filter((p) => p < LIMIAR_BAIXA_FREQUENCIA).length

  // Professores com pelo menos uma pendência (turma sem registro de ontem
  // ou com avaliação sem nota) — cada par já sabe exatamente de qual
  // professor é a pendência, então basta pegar os professorId únicos.
  const professoresComPendencia = new Set(
    [...paresSemRegistro, ...paresAvaliacaoPendente].map((par) => par.split(':')[1]),
  ).size

  const [
    aulasPrevistasHojeConta,
    eventosHoje,
    proximasProvas,
    proximasReunioes,
    proximosOutros,
    agendaHoje,
  ] = await Promise.all([
    hojeEhFeriado
      ? Promise.resolve(0)
      : prisma.turma.count({
          where: { excluidoEm: null, anoLetivo: anoAtual, diasAula: { has: weekdayHoje } },
        }),
    prisma.evento.groupBy({
      by: ['tipo'],
      where: { data: new Date(`${hoje}T00:00:00.000Z`) },
      _count: { _all: true },
    }),
    prisma.evento.findMany({
      where: { tipo: 'prova', concluido: false, data: { gte: new Date(`${hoje}T00:00:00.000Z`) } },
      orderBy: { data: 'asc' },
      take: 5,
      include: { turma: { select: { nome: true } } },
    }),
    prisma.evento.findMany({
      where: { tipo: 'reuniao', concluido: false, data: { gte: new Date(`${hoje}T00:00:00.000Z`) } },
      orderBy: { data: 'asc' },
      take: 5,
      include: { turma: { select: { nome: true } } },
    }),
    prisma.evento.findMany({
      where: { tipo: 'outro', concluido: false, data: { gte: new Date(`${hoje}T00:00:00.000Z`) } },
      orderBy: { data: 'asc' },
      take: 5,
      include: { turma: { select: { nome: true } } },
    }),
    // Agenda do dia — todo evento de hoje (qualquer tipo), ordenado por
    // horário, pra responder "o que tenho hoje" numa lista só.
    prisma.evento.findMany({
      where: { data: new Date(`${hoje}T00:00:00.000Z`) },
      orderBy: [{ hora: 'asc' }, { titulo: 'asc' }],
      include: { turma: { select: { nome: true } } },
    }),
  ])

  function contarTipo(tipo: string): number {
    return eventosHoje.find((e) => e.tipo === tipo)?._count._all ?? 0
  }

  function serializarEvento(e: {
    id: string
    titulo: string
    tipo?: string
    data: Date
    hora: string | null
    turma: { nome: string } | null
  }) {
    return {
      id: e.id,
      titulo: e.titulo,
      tipo: e.tipo,
      data: e.data.toISOString().slice(0, 10),
      hora: e.hora,
      turmaNome: e.turma?.nome ?? null,
    }
  }

  const nomeFeriadoHoje = hojeEhFeriado
    ? feriadosNacionais(Number(anoAtual)).find((f) => f.data === hoje)?.titulo ?? null
    : null

  return {
    data: hoje,
    feriadoHoje: nomeFeriadoHoje,
    totais: {
      professores: totalProfessores,
      turmas: totalTurmas,
      alunos: totalAlunos,
      frequenciaMedia,
      alunosComBaixaFrequencia,
    },
    hoje: {
      aulasPrevistas: aulasPrevistasHojeConta,
      aulasRegistradas: aulasRegistradasHoje,
      provas: contarTipo('prova'),
      reunioes: contarTipo('reuniao'),
      eventos: contarTipo('outro'),
    },
    proximasProvas: proximasProvas.map(serializarEvento),
    proximasReunioes: proximasReunioes.map(serializarEvento),
    proximosEventos: proximosOutros.map(serializarEvento),
    agendaHoje: agendaHoje.map(serializarEvento),
    pendencias: {
      turmasSemRegistroOntem: idsSemRegistroOntem.size,
      turmasComAvaliacaoPendente: idsAvaliacaoPendente.size,
      professoresComPendencia,
    },
  }
}

// Proporção de aulas dadas (DataAula, ignorando "sem aula") que já têm o
// resumo registrado (RegistroAula) — desde sempre, não só hoje/ontem.
// Base do semáforo 🟢/🟡/🔴 de "situação de registro" por professor.
async function situacaoRegistroPorProfessor(): Promise<Map<string, 'boa' | 'atencao' | 'critica' | 'semDados'>> {
  const [datasAula, registrosAula] = await Promise.all([
    prisma.dataAula.findMany({
      where: { semAula: false, turma: { excluidoEm: null } },
      select: { professorId: true, data: true },
    }),
    prisma.registroAula.findMany({
      where: { turma: { excluidoEm: null } },
      select: { professorId: true, data: true },
    }),
  ])

  const datasPorProfessor = new Map<string, string[]>()
  for (const d of datasAula) {
    const arr = datasPorProfessor.get(d.professorId) ?? []
    arr.push(d.data.toISOString().slice(0, 10))
    datasPorProfessor.set(d.professorId, arr)
  }
  const registrosPorProfessor = new Map<string, Set<string>>()
  for (const r of registrosAula) {
    const set = registrosPorProfessor.get(r.professorId) ?? new Set()
    set.add(r.data.toISOString().slice(0, 10))
    registrosPorProfessor.set(r.professorId, set)
  }

  const situacoes = new Map<string, 'boa' | 'atencao' | 'critica' | 'semDados'>()
  const idsProfessores = new Set([...datasPorProfessor.keys(), ...registrosPorProfessor.keys()])
  for (const professorId of idsProfessores) {
    const datas = datasPorProfessor.get(professorId) ?? []
    const registros = registrosPorProfessor.get(professorId) ?? new Set()
    const feitas = datas.filter((d) => registros.has(d)).length
    situacoes.set(professorId, situacaoRegistro(feitas, datas.length))
  }
  return situacoes
}

export async function listarProfessores() {
  const anoAtual = hojeNoBrasil().slice(0, 4)
  const [professores, turmasComMetricas, paresSemRegistro, paresAvaliacaoPendente, paresAulaHoje, situacoes] =
    await Promise.all([
      prisma.professor.findMany({
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          email: true,
          materias: true,
          isAdmin: true,
          criadoEm: true,
          _count: { select: { turmasAtribuidas: true } },
        },
      }),
      obterTurmasComMetricas(),
      paresSemRegistroOntem(anoAtual),
      paresComAvaliacaoPendente(),
      paresComAulaRegistradaHoje(),
      situacaoRegistroPorProfessor(),
    ])

  return professores.map((p) => {
    const turmasDoProfessor = turmasComMetricas.filter((t) =>
      t.professores.some((pr) => pr.professorId === p.id),
    )
    const aulasRegistradasHoje = turmasDoProfessor.filter((t) =>
      paresAulaHoje.has(`${t.id}:${p.id}`),
    ).length
    const pendencias = turmasDoProfessor.filter((t) => {
      const chave = `${t.id}:${p.id}`
      return paresSemRegistro.has(chave) || paresAvaliacaoPendente.has(chave)
    }).length
    return {
      id: p.id,
      nome: p.nome,
      email: p.email,
      materias: p.materias,
      isAdmin: p.isAdmin,
      criadoEm: p.criadoEm.toISOString(),
      totalTurmas: p._count.turmasAtribuidas,
      aulasRegistradasHoje,
      pendencias,
      situacaoRegistro: situacoes.get(p.id) ?? 'semDados',
    }
  })
}

// Números da escola inteira sobre professores — pro(a) diretor(a)
// enxergar de cara quantos estão em dia com o registro das aulas.
export async function obterResumoProfessores() {
  const [total, situacoes] = await Promise.all([
    prisma.professor.count(),
    situacaoRegistroPorProfessor(),
  ])

  let emDia = 0
  let pendentes = 0
  let comProblemas = 0
  let semDados = 0
  for (const situacao of situacoes.values()) {
    if (situacao === 'boa') emDia++
    else if (situacao === 'atencao') pendentes++
    else if (situacao === 'critica') comProblemas++
  }
  // Professor sem nenhuma turma/dado ainda (ex.: diretor(a), coordenação,
  // ou recém-cadastrado) não entra nos 3 baldes — não tem o que avaliar.
  semDados = total - (emDia + pendentes + comProblemas)

  return { total, emDia, pendentes, comProblemas, semDados }
}

// Todas as turmas da escola, com professor responsável, frequência média
// e pendências — usada na área "Turmas" do painel do(a) diretor(a).
export async function listarTurmasDetalhado() {
  return obterTurmasComMetricas()
}

// Todos os alunos da escola, com turma/professor e frequência — ordenados
// com a menor frequência primeiro, pra quem tem baixa frequência aparecer
// logo no topo (sem o diretor precisar caçar manualmente).
export async function listarAlunosDetalhado() {
  const [alunos, percentuaisPorAluno] = await Promise.all([
    prisma.aluno.findMany({
      where: { excluidoEm: null, turma: { excluidoEm: null } },
      select: {
        id: true,
        nome: true,
        situacao: true,
        turmaId: true,
        turma: {
          select: {
            nome: true,
            escola: true,
            professores: { select: { professorId: true, professor: { select: { nome: true } } } },
          },
        },
      },
      orderBy: { nome: 'asc' },
    }),
    calcularFrequenciaPorAluno(),
  ])

  return alunos
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      situacao: a.situacao,
      turmaId: a.turmaId,
      turmaNome: a.turma.nome,
      escola: a.turma.escola,
      professores: a.turma.professores.map((p) => ({ id: p.professorId, nome: p.professor.nome })),
      professorNome: a.turma.professores.map((p) => p.professor.nome).join(', ') || '—',
      frequenciaPercentual: percentuaisPorAluno.get(a.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.frequenciaPercentual == null && b.frequenciaPercentual == null) return 0
      if (a.frequenciaPercentual == null) return 1
      if (b.frequenciaPercentual == null) return -1
      return a.frequenciaPercentual - b.frequenciaPercentual
    })
}

// Resumo da escola inteira em números — pro(a) diretor(a) enxergar
// "quantos alunos precisam de atenção" sem abrir a lista completa.
export async function obterResumoAlunos() {
  const [porSituacao, percentuaisPorAluno, alunosComAcompanhamento] = await Promise.all([
    prisma.aluno.groupBy({
      by: ['situacao'],
      where: { excluidoEm: null, turma: { excluidoEm: null } },
      _count: { _all: true },
    }),
    calcularFrequenciaPorAluno(),
    prisma.acompanhamentoAluno.findMany({
      where: { aluno: { excluidoEm: null, turma: { excluidoEm: null } } },
      select: { alunoId: true },
      distinct: ['alunoId'],
    }),
  ])

  function contarSituacao(situacao: string): number {
    return porSituacao.find((s) => s.situacao === situacao)?._count._all ?? 0
  }

  const baixaFrequencia = Array.from(percentuaisPorAluno.values()).filter(
    (p) => p < LIMIAR_BAIXA_FREQUENCIA,
  ).length

  return {
    total: porSituacao.reduce((soma, s) => soma + s._count._all, 0),
    ativos: contarSituacao('ativo'),
    transferidos: contarSituacao('transferido'),
    inativos: contarSituacao('inativo'),
    baixaFrequencia,
    comAcompanhamento: alunosComAcompanhamento.length,
  }
}

export async function excluirProfessor(professorId: string, quemPediuId: string) {
  if (professorId === quemPediuId) {
    throw AppError.requisicaoInvalida('Você não pode excluir a própria conta enquanto estiver logado nela.')
  }

  const professor = await prisma.professor.findUnique({ where: { id: professorId } })
  if (!professor) throw AppError.naoEncontrado('Professor')

  // Turmas passaram a ser da escola, não do professor — apagar a conta não
  // pode mais arrastar turmas compartilhadas com outros professores. Só a
  // atribuição dele (TurmaProfessor) cai em cascata; avaliações, datas de
  // aula, planos e registros ficam retidos como histórico, então bloqueiam
  // a exclusão até serem removidos manualmente.
  const [avaliacoes, datasAula, planos, registros] = await Promise.all([
    prisma.avaliacao.count({ where: { professorId } }),
    prisma.dataAula.count({ where: { professorId } }),
    prisma.planoDeAula.count({ where: { professorId } }),
    prisma.registroAula.count({ where: { professorId } }),
  ])
  if (avaliacoes + datasAula + planos + registros > 0) {
    throw AppError.requisicaoInvalida(
      'Esse professor ainda tem avaliações, frequência, planos ou registros de aula lançados — remova as atribuições de turma dele antes de excluir a conta.',
    )
  }

  // ConfigCalculo não entra na checagem acima: é criada automaticamente
  // (com valores padrão) toda vez que o professor é atribuído a uma turma,
  // mesmo que ele nunca lance nada — não é histórico de trabalho, é só
  // configuração presa à atribuição que já está sendo removida (TurmaProfessor
  // cai em cascata). Sem isso, a FK (ON DELETE RESTRICT) rejeitava o delete
  // com um 500 genérico mesmo quando a checagem acima dizia estar tudo limpo.
  await prisma.$transaction([
    prisma.configCalculo.deleteMany({ where: { professorId } }),
    prisma.professor.delete({ where: { id: professorId } }),
  ])
}
