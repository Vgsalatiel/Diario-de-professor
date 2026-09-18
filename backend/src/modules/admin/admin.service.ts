import { prisma } from '../../lib/prisma'
import { AppError } from '../../utils/AppError'
import { hojeNoBrasil } from '../../utils/serializers'

function diaAnterior(dataISO: string): string {
  const d = new Date(`${dataISO}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// diasAula usa 0=domingo..6=sábado (mesma convenção do resto do app).
function diaDaSemana(dataISO: string): number {
  return new Date(`${dataISO}T00:00:00.000Z`).getUTCDay()
}

export async function obterDashboard() {
  const hoje = hojeNoBrasil()
  const ontem = diaAnterior(hoje)
  const anoAtual = hoje.slice(0, 4)
  const weekdayHoje = diaDaSemana(hoje)
  const weekdayOntem = diaDaSemana(ontem)

  const [totalProfessores, totalTurmas, totalAlunos] = await Promise.all([
    prisma.professor.count(),
    prisma.turma.count({ where: { excluidoEm: null } }),
    prisma.aluno.count({ where: { excluidoEm: null, turma: { excluidoEm: null } } }),
  ])

  const [aulasPrevistasHoje, eventosHoje, proximasProvas, proximasReunioes, proximosOutros] =
    await Promise.all([
      prisma.turma.count({
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

  // Pendência 1: turmas que tinham aula ontem (pelo dia da semana) mas
  // ninguém registrou "o que foi aplicado" pra ontem.
  const turmasComAulaOntem = await prisma.turma.findMany({
    where: { excluidoEm: null, anoLetivo: anoAtual, diasAula: { has: weekdayOntem } },
    select: { id: true },
  })
  const idsComAulaOntem = turmasComAulaOntem.map((t) => t.id)
  const turmasComRegistroOntem = idsComAulaOntem.length
    ? await prisma.registroAula.count({
        where: { turmaId: { in: idsComAulaOntem }, data: new Date(`${ontem}T00:00:00.000Z`) },
      })
    : 0
  const turmasSemRegistroOntem = idsComAulaOntem.length - turmasComRegistroOntem

  // Pendência 2: turmas com pelo menos uma avaliação sem nenhuma nota lançada.
  const turmasComAvaliacaoPendente = await prisma.turma.count({
    where: {
      excluidoEm: null,
      avaliacoes: { some: { notas: { none: { valor: { not: null } } } } },
    },
  })

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

  return {
    data: hoje,
    totais: { professores: totalProfessores, turmas: totalTurmas, alunos: totalAlunos },
    hoje: {
      aulasPrevistas: aulasPrevistasHoje,
      provas: contarTipo('prova'),
      reunioes: contarTipo('reuniao'),
      eventos: contarTipo('outro'),
    },
    proximasProvas: proximasProvas.map(serializarEvento),
    proximasReunioes: proximasReunioes.map(serializarEvento),
    proximosEventos: proximosOutros.map(serializarEvento),
    pendencias: {
      turmasSemRegistroOntem: Math.max(0, turmasSemRegistroOntem),
      turmasComAvaliacaoPendente,
    },
  }
}

export async function listarProfessores() {
  const professores = await prisma.professor.findMany({
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
  })

  return professores.map((p) => ({
    id: p.id,
    nome: p.nome,
    email: p.email,
    materias: p.materias,
    isAdmin: p.isAdmin,
    criadoEm: p.criadoEm.toISOString(),
    totalTurmas: p._count.turmas,
  }))
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
