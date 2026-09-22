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

// Turmas com aula marcada pra "ontem" (pelo dia da semana) que ninguém
// registrou o que foi aplicado — mesma lógica da pendência do dashboard,
// mas devolvendo os ids das turmas em vez de só a contagem, pra dar pra
// destacar cada uma individualmente nas telas de Turmas/Professores.
async function turmasSemRegistroOntemIds(anoAtual: string): Promise<Set<string>> {
  const hoje = hojeNoBrasil()
  const ontem = diaAnterior(hoje)
  if (ehFeriadoNacional(ontem)) return new Set()

  const weekdayOntem = diaDaSemana(ontem)
  const turmasComAulaOntem = await prisma.turma.findMany({
    where: { excluidoEm: null, anoLetivo: anoAtual, diasAula: { has: weekdayOntem } },
    select: { id: true },
  })
  const idsComAulaOntem = turmasComAulaOntem.map((t) => t.id)
  if (idsComAulaOntem.length === 0) return new Set()

  const registrosOntem = await prisma.registroAula.findMany({
    where: { turmaId: { in: idsComAulaOntem }, data: new Date(`${ontem}T00:00:00.000Z`) },
    select: { turmaId: true },
  })
  const idsComRegistroOntem = new Set(registrosOntem.map((r) => r.turmaId))
  return new Set(idsComAulaOntem.filter((id) => !idsComRegistroOntem.has(id)))
}

// Turmas com pelo menos uma avaliação sem nenhuma nota lançada ainda.
async function turmasComAvaliacaoPendenteIds(): Promise<Set<string>> {
  const turmas = await prisma.turma.findMany({
    where: { excluidoEm: null, avaliacoes: { some: { notas: { none: { valor: { not: null } } } } } },
    select: { id: true },
  })
  return new Set(turmas.map((t) => t.id))
}

// Base compartilhada pelas telas de Turmas e Professores (e reaproveitada
// pelo módulo de coordenação) — evita calcular a mesma coisa (frequência
// por turma, pendências) duas vezes.
export async function obterTurmasComMetricas() {
  const anoAtual = hojeNoBrasil().slice(0, 4)
  const hoje = hojeNoBrasil()

  const [turmas, alunosAtivos, percentuaisPorAluno, idsSemRegistroOntem, idsAvaliacaoPendente, registrosHoje] =
    await Promise.all([
      prisma.turma.findMany({
        where: { excluidoEm: null },
        select: {
          id: true,
          nome: true,
          escola: true,
          anoLetivo: true,
          professorId: true,
          professor: { select: { nome: true } },
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.aluno.findMany({
        where: { excluidoEm: null, situacao: 'ativo' },
        select: { id: true, turmaId: true },
      }),
      calcularFrequenciaPorAluno(),
      turmasSemRegistroOntemIds(anoAtual),
      turmasComAvaliacaoPendenteIds(),
      prisma.registroAula.findMany({
        where: { data: new Date(`${hoje}T00:00:00.000Z`), turma: { excluidoEm: null } },
        select: { turmaId: true },
      }),
    ])

  const alunosPorTurma = new Map<string, string[]>()
  for (const a of alunosAtivos) {
    const arr = alunosPorTurma.get(a.turmaId) ?? []
    arr.push(a.id)
    alunosPorTurma.set(a.turmaId, arr)
  }
  const idsComAulaRegistradaHoje = new Set(registrosHoje.map((r) => r.turmaId))

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
      escola: t.escola,
      anoLetivo: t.anoLetivo,
      professorId: t.professorId,
      professorNome: t.professor.nome,
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
    idsSemRegistroOntem,
    idsAvaliacaoPendente,
    aulasRegistradasHoje,
  ] = await Promise.all([
    prisma.professor.count(),
    prisma.turma.count({ where: { excluidoEm: null } }),
    prisma.aluno.count({ where: { excluidoEm: null, turma: { excluidoEm: null } } }),
    calcularFrequenciaPorAluno(),
    turmasSemRegistroOntemIds(anoAtual),
    turmasComAvaliacaoPendenteIds(),
    prisma.registroAula.count({
      where: { data: new Date(`${hoje}T00:00:00.000Z`), turma: { excluidoEm: null } },
    }),
  ])

  const percentuais = Array.from(percentuaisPorAluno.values())
  const frequenciaMedia =
    percentuais.length > 0 ? Math.round(percentuais.reduce((a, b) => a + b, 0) / percentuais.length) : null
  const alunosComBaixaFrequencia = percentuais.filter((p) => p < LIMIAR_BAIXA_FREQUENCIA).length

  const [aulasPrevistasHojeConta, eventosHoje, proximasProvas, proximasReunioes, proximosOutros] =
    await Promise.all([
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
    ])

  function contarTipo(tipo: string): number {
    return eventosHoje.find((e) => e.tipo === tipo)?._count._all ?? 0
  }

  function serializarEvento(e: {
    id: string
    titulo: string
    data: Date
    hora: string | null
    turma: { nome: string } | null
  }) {
    return {
      id: e.id,
      titulo: e.titulo,
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
    pendencias: {
      turmasSemRegistroOntem: idsSemRegistroOntem.size,
      turmasComAvaliacaoPendente: idsAvaliacaoPendente.size,
    },
  }
}

export async function listarProfessores() {
  const [professores, turmasComMetricas] = await Promise.all([
    prisma.professor.findMany({
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        email: true,
        materias: true,
        isAdmin: true,
        criadoEm: true,
        _count: { select: { turmas: true } },
      },
    }),
    obterTurmasComMetricas(),
  ])

  return professores.map((p) => {
    const turmasDoProfessor = turmasComMetricas.filter((t) => t.professorId === p.id)
    return {
      id: p.id,
      nome: p.nome,
      email: p.email,
      materias: p.materias,
      isAdmin: p.isAdmin,
      criadoEm: p.criadoEm.toISOString(),
      totalTurmas: p._count.turmas,
      aulasRegistradasHoje: turmasDoProfessor.filter((t) => t.aulaRegistradaHoje).length,
      pendencias: turmasDoProfessor.filter((t) => t.semRegistroOntem || t.avaliacaoPendente).length,
    }
  })
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
        turma: { select: { nome: true, escola: true, professor: { select: { nome: true } } } },
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
      turmaNome: a.turma.nome,
      escola: a.turma.escola,
      professorNome: a.turma.professor.nome,
      frequenciaPercentual: percentuaisPorAluno.get(a.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.frequenciaPercentual == null && b.frequenciaPercentual == null) return 0
      if (a.frequenciaPercentual == null) return 1
      if (b.frequenciaPercentual == null) return -1
      return a.frequenciaPercentual - b.frequenciaPercentual
    })
}

export async function excluirProfessor(professorId: string, quemPediuId: string) {
  if (professorId === quemPediuId) {
    throw AppError.requisicaoInvalida('Você não pode excluir a própria conta enquanto estiver logado nela.')
  }

  const professor = await prisma.professor.findUnique({ where: { id: professorId } })
  if (!professor) throw AppError.naoEncontrado('Professor')

  // Cascade do schema já apaga turmas, alunos, notas, eventos, planos etc.
  await prisma.professor.delete({ where: { id: professorId } })
}
