import { prisma } from '../../lib/prisma'
import { AppError } from '../../utils/AppError'
import { paraDataISO } from '../../utils/serializers'
import * as adminService from '../admin/admin.service'
import type { CriarObservacaoDto, CriarReuniaoDto } from './coordenacao.dto'

// A coordenação acompanha a mesma visão geral (dashboard, professores,
// turmas, alunos) que o painel de diretor(a) já calcula — reaproveita em
// vez de duplicar a lógica de pendências/frequência.
export const obterDashboard = adminService.obterDashboard
export const listarProfessores = adminService.listarProfessores
export const listarTurmasDetalhado = adminService.listarTurmasDetalhado
export const listarAlunosDetalhado = adminService.listarAlunosDetalhado

// Detalhe pedagógico de um professor: turmas com métricas, planos de aula
// recentes, alunos com dificuldade registrada e observações já feitas —
// tudo que a coordenação precisa pra "acompanhar" sem abrir cada turma.
export async function detalharProfessor(professorId: string) {
  const professor = await prisma.professor.findUnique({
    where: { id: professorId },
    select: { id: true, nome: true, email: true, materias: true, criadoEm: true },
  })
  if (!professor) throw AppError.naoEncontrado('Professor')

  const [turmasComMetricas, planos, alunosComDificuldade, observacoes] = await Promise.all([
    adminService.obterTurmasComMetricas(),
    prisma.planoDeAula.findMany({
      where: { turma: { professorId, excluidoEm: null } },
      select: {
        id: true,
        titulo: true,
        dataInicio: true,
        dataFim: true,
        turma: { select: { nome: true } },
      },
      orderBy: { dataInicio: 'desc' },
      take: 10,
    }),
    prisma.aluno.findMany({
      where: { turma: { professorId, excluidoEm: null }, excluidoEm: null, dificuldades: { not: null } },
      select: { id: true, nome: true, dificuldades: true, turma: { select: { nome: true } } },
    }),
    prisma.observacaoPedagogica.findMany({
      where: { professorAlvoId: professorId },
      orderBy: { criadoEm: 'desc' },
      take: 20,
      include: { autor: { select: { nome: true } }, turma: { select: { nome: true } } },
    }),
  ])

  return {
    id: professor.id,
    nome: professor.nome,
    email: professor.email,
    materias: professor.materias,
    criadoEm: professor.criadoEm.toISOString(),
    turmas: turmasComMetricas.filter((t) => t.professorId === professorId),
    planosDeAula: planos.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      dataInicio: paraDataISO(p.dataInicio),
      dataFim: paraDataISO(p.dataFim),
      turmaNome: p.turma.nome,
    })),
    alunosComDificuldade: alunosComDificuldade.map((a) => ({
      id: a.id,
      nome: a.nome,
      dificuldades: a.dificuldades,
      turmaNome: a.turma.nome,
    })),
    observacoes: observacoes.map(serializarObservacao),
  }
}

// Detalhe pedagógico de uma turma: médias por avaliação, último registro
// de aula, plano em andamento e alunos com dificuldade — visão da turma
// sem depender do professor abrir cada tela pra coordenação ver.
export async function detalharTurma(turmaId: string) {
  const turma = await prisma.turma.findFirst({
    where: { id: turmaId, excluidoEm: null },
    select: {
      id: true,
      nome: true,
      escola: true,
      anoLetivo: true,
      professor: { select: { id: true, nome: true } },
    },
  })
  if (!turma) throw AppError.naoEncontrado('Turma')

  const [alunos, avaliacoes, notas, ultimoRegistro, planoAtivo] = await Promise.all([
    prisma.aluno.findMany({
      where: { turmaId, excluidoEm: null },
      select: { id: true, nome: true, dificuldades: true, situacao: true },
    }),
    prisma.avaliacao.findMany({ where: { turmaId }, orderBy: { periodo: 'asc' } }),
    prisma.nota.findMany({ where: { avaliacao: { turmaId } } }),
    prisma.registroAula.findFirst({ where: { turmaId }, orderBy: { data: 'desc' } }),
    prisma.planoDeAula.findFirst({ where: { turmaId }, orderBy: { criadoEm: 'desc' } }),
  ])

  const mediasPorAvaliacao = avaliacoes.map((av) => {
    const notasDaAval = notas.filter((n) => n.avaliacaoId === av.id && n.valor != null)
    const media =
      notasDaAval.length > 0
        ? notasDaAval.reduce((soma, n) => soma + (n.valor ?? 0), 0) / notasDaAval.length
        : null
    return {
      id: av.id,
      nome: av.nome,
      mediaTurma: media != null ? Math.round(media * 10) / 10 : null,
      totalLancadas: notasDaAval.length,
    }
  })

  return {
    id: turma.id,
    nome: turma.nome,
    escola: turma.escola,
    anoLetivo: turma.anoLetivo,
    professorId: turma.professor.id,
    professorNome: turma.professor.nome,
    totalAlunos: alunos.filter((a) => a.situacao === 'ativo').length,
    alunosComDificuldade: alunos
      .filter((a) => a.dificuldades)
      .map((a) => ({ id: a.id, nome: a.nome, dificuldades: a.dificuldades })),
    mediasPorAvaliacao,
    ultimoRegistroAula: ultimoRegistro
      ? { data: paraDataISO(ultimoRegistro.data), resumo: ultimoRegistro.resumo }
      : null,
    planoAtivo: planoAtivo
      ? {
          id: planoAtivo.id,
          titulo: planoAtivo.titulo,
          dataInicio: paraDataISO(planoAtivo.dataInicio),
          dataFim: paraDataISO(planoAtivo.dataFim),
        }
      : null,
  }
}

// Reuniões/provas/trabalhos da escola inteira — calendário pedagógico da
// coordenação, ao contrário de /eventos (que só mostra os de quem está
// logado).
export async function listarEventosDaEscola() {
  const eventos = await prisma.evento.findMany({
    where: { tipo: { in: ['reuniao', 'prova', 'trabalho'] } },
    orderBy: { data: 'asc' },
    include: { turma: { select: { nome: true } }, professor: { select: { nome: true } } },
  })
  return eventos.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    tipo: e.tipo,
    data: paraDataISO(e.data),
    hora: e.hora,
    concluido: e.concluido,
    turmaNome: e.turma?.nome ?? null,
    professorNome: e.professor.nome,
  }))
}

// A coordenação pode marcar reunião numa turma que não é dela (ela não é
// dona de turma nenhuma) — por isso não passa pela checagem de posse que
// o módulo de eventos normal usa, só confere que a turma existe.
export async function criarReuniao(coordenadorId: string, dados: CriarReuniaoDto) {
  if (dados.turmaId) {
    const turma = await prisma.turma.findFirst({ where: { id: dados.turmaId, excluidoEm: null } })
    if (!turma) throw AppError.naoEncontrado('Turma')
  }
  const evento = await prisma.evento.create({
    data: {
      titulo: dados.titulo,
      tipo: 'reuniao',
      data: new Date(dados.data),
      hora: dados.hora || undefined,
      conteudo: dados.conteudo || undefined,
      turmaId: dados.turmaId || undefined,
      professorId: coordenadorId,
    },
  })
  return { ...evento, data: paraDataISO(evento.data), prazo: paraDataISO(evento.prazo) }
}

function serializarObservacao(o: {
  id: string
  texto: string
  criadoEm: Date
  autor: { nome: string }
  turma: { nome: string } | null
}) {
  return {
    id: o.id,
    texto: o.texto,
    criadoEm: o.criadoEm.toISOString(),
    autorNome: o.autor.nome,
    turmaNome: o.turma?.nome ?? null,
  }
}

// Sem filtro: todas as observações (visão da coordenação). Com
// professorId: só as endereçadas a ele — usado tanto pelo painel da
// coordenação filtrando por professor quanto pelo próprio professor lendo
// as que recebeu.
export async function listarObservacoes(professorAlvoId?: string) {
  const observacoes = await prisma.observacaoPedagogica.findMany({
    where: professorAlvoId ? { professorAlvoId } : undefined,
    orderBy: { criadoEm: 'desc' },
    include: { autor: { select: { nome: true } }, turma: { select: { nome: true } } },
  })
  return observacoes.map(serializarObservacao)
}

export async function criarObservacao(autorId: string, dados: CriarObservacaoDto) {
  const alvo = await prisma.professor.findUnique({ where: { id: dados.professorAlvoId } })
  if (!alvo) throw AppError.naoEncontrado('Professor')
  if (dados.turmaId) {
    const turma = await prisma.turma.findFirst({ where: { id: dados.turmaId, excluidoEm: null } })
    if (!turma) throw AppError.naoEncontrado('Turma')
  }

  const observacao = await prisma.observacaoPedagogica.create({
    data: {
      texto: dados.texto,
      autorId,
      professorAlvoId: dados.professorAlvoId,
      turmaId: dados.turmaId,
    },
    include: { autor: { select: { nome: true } }, turma: { select: { nome: true } } },
  })
  return serializarObservacao(observacao)
}

export async function removerObservacao(id: string, autorId: string) {
  const observacao = await prisma.observacaoPedagogica.findUnique({ where: { id } })
  if (!observacao || observacao.autorId !== autorId) throw AppError.naoEncontrado('Observação')
  await prisma.observacaoPedagogica.delete({ where: { id } })
}
