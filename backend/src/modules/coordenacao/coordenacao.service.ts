import { prisma } from '../../lib/prisma'
import { AppError } from '../../utils/AppError'
import { paraDataISO } from '../../utils/serializers'
import * as adminService from '../admin/admin.service'
import type {
  AtribuirProfessorDto,
  AtualizarReuniaoDto,
  CriarAcompanhamentoDto,
  CriarEncaminhamentoDto,
  CriarObservacaoDto,
  CriarReuniaoDto,
} from './coordenacao.dto'
import type { AtualizarTurmaDto, CriarTurmaDto, PromoverTurmaDto } from '../turmas/turmas.dto'

// A coordenação acompanha a mesma visão geral (dashboard, turmas, alunos)
// que o painel de diretor(a) já calcula — reaproveita em vez de duplicar a
// lógica de pendências/frequência.
export const obterDashboard = adminService.obterDashboard
export const listarAlunosDetalhado = adminService.listarAlunosDetalhado

// Lista pra tela "Turmas" da coordenação — mesma base do painel de
// diretor(a) (alunos, frequência, pendências), só que com a média geral
// de notas da turma a mais, que o diretor não precisa mas a coordenação
// quer ver de cara no card.
export async function listarTurmas() {
  const [turmasComMetricas, avaliacoes] = await Promise.all([
    adminService.obterTurmasComMetricas(),
    prisma.avaliacao.findMany({
      select: { turmaId: true, periodo: true, notas: { select: { valor: true } } },
      orderBy: { periodo: 'asc' },
    }),
  ])

  // Duas contas diferentes de propósito: "Média" do card é a média simples
  // de todas as notas lançadas (mesma conta que o drawer da turma usa).
  // "tendencia" olha a sequência de médias por avaliação — outra pergunta
  // (a turma está piorando?), não dá pra responder com um número só.
  const notasPorTurma = new Map<string, number[]>()
  const avaliacoesPorTurma = new Map<string, { mediaTurma: number | null }[]>()
  for (const av of avaliacoes) {
    const notasDaAval = av.notas.map((n) => n.valor).filter((v): v is number => v != null)
    const mediaDaAval =
      notasDaAval.length > 0
        ? Math.round((notasDaAval.reduce((s, v) => s + v, 0) / notasDaAval.length) * 10) / 10
        : null

    const notas = notasPorTurma.get(av.turmaId) ?? []
    notas.push(...notasDaAval)
    notasPorTurma.set(av.turmaId, notas)

    const arr = avaliacoesPorTurma.get(av.turmaId) ?? []
    arr.push({ mediaTurma: mediaDaAval })
    avaliacoesPorTurma.set(av.turmaId, arr)
  }

  return turmasComMetricas.map((t) => {
    const notas = notasPorTurma.get(t.id) ?? []
    const mediaTurma =
      notas.length > 0 ? Math.round((notas.reduce((s, v) => s + v, 0) / notas.length) * 10) / 10 : null
    return { ...t, mediaTurma, tendencia: calcularTendencia(avaliacoesPorTurma.get(t.id) ?? []) }
  })
}

// Só aponta tendência quando as últimas 3 avaliações lançadas formam uma
// sequência consistente (cada uma pior/melhor que a anterior) — não é a IA
// "decidindo" que há um problema, é uma regra fixa e explicável sobre os
// números que a própria coordenação pode conferir.
function calcularTendencia(
  mediasPorAvaliacao: { mediaTurma: number | null }[],
): { direcao: 'queda' | 'alta'; texto: string } | null {
  const valores = mediasPorAvaliacao.map((m) => m.mediaTurma).filter((v): v is number => v != null)
  if (valores.length < 3) return null
  const [a, b, c] = valores.slice(-3)

  if (a > b && b > c) {
    return {
      direcao: 'queda',
      texto: `Queda de desempenho na turma — média foi de ${a} para ${c} nas últimas 3 avaliações.`,
    }
  }
  if (a < b && b < c) {
    return {
      direcao: 'alta',
      texto: `Melhora de desempenho na turma — média foi de ${a} para ${c} nas últimas 3 avaliações.`,
    }
  }
  return null
}

// "Registro em dia" = tem resumo da aula (RegistroAula) pra cada data em
// que a chamada foi feita (DataAula, ignorando dias marcados "sem aula").
// Serve de proxy honesto pra "professor está documentando as aulas que dá"
// sem precisar recalcular o calendário letivo inteiro.
function situacaoRegistro(feitas: number, esperadas: number): 'boa' | 'atencao' | 'critica' | 'semDados' {
  if (esperadas === 0) return 'semDados'
  const proporcao = feitas / esperadas
  if (proporcao >= 0.9) return 'boa'
  if (proporcao >= 0.5) return 'atencao'
  return 'critica'
}

// Lista pra tabela "Professores" da coordenação: turmas, quantas aulas já
// deram tiveram o resumo registrado (X/Y) e o semáforo dessa proporção.
export async function listarProfessores() {
  const professores = await prisma.professor.findMany({
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      email: true,
      materias: true,
      turmasAtribuidas: {
        where: { turma: { excluidoEm: null } },
        select: {
          turma: { select: { id: true, nome: true } },
        },
      },
    },
  })

  const professorIds = professores.map((p) => p.id)
  const [datasAula, registrosAula] = await Promise.all([
    prisma.dataAula.findMany({
      where: { professorId: { in: professorIds }, semAula: false, turma: { excluidoEm: null } },
      select: { professorId: true, data: true },
    }),
    prisma.registroAula.findMany({
      where: { professorId: { in: professorIds }, turma: { excluidoEm: null } },
      select: { professorId: true, data: true },
    }),
  ])

  const datasPorProfessor = new Map<string, string[]>()
  for (const d of datasAula) {
    const arr = datasPorProfessor.get(d.professorId) ?? []
    arr.push(paraDataISO(d.data)!)
    datasPorProfessor.set(d.professorId, arr)
  }
  const registrosPorProfessor = new Map<string, Set<string>>()
  for (const r of registrosAula) {
    const set = registrosPorProfessor.get(r.professorId) ?? new Set()
    set.add(paraDataISO(r.data)!)
    registrosPorProfessor.set(r.professorId, set)
  }

  return professores.map((p) => {
    const datas = datasPorProfessor.get(p.id) ?? []
    const registros = registrosPorProfessor.get(p.id) ?? new Set()
    const feitas = datas.filter((d) => registros.has(d)).length
    return {
      id: p.id,
      nome: p.nome,
      email: p.email,
      materias: p.materias,
      turmasNomes: p.turmasAtribuidas.map((ta) => ta.turma.nome),
      registrosFeitos: feitas,
      registrosEsperados: datas.length,
      situacaoRegistro: situacaoRegistro(feitas, datas.length),
    }
  })
}

// Detalhe pedagógico de um professor — turmas, disciplinas e os 3 tipos de
// registro (aulas/frequência/avaliações), cada um com sua proporção feita
// vs esperada, mais pendências concretas e o histórico de
// observações/solicitações já trocadas com ele.
export async function detalharProfessor(professorId: string) {
  const professor = await prisma.professor.findUnique({
    where: { id: professorId },
    select: {
      id: true,
      nome: true,
      email: true,
      materias: true,
      criadoEm: true,
      turmasAtribuidas: {
        where: { turma: { excluidoEm: null } },
        select: {
          turma: {
            select: {
              id: true,
              nome: true,
              datasAula: {
                where: { semAula: false, professorId },
                select: { id: true, data: true, frequencias: { select: { presente: true } } },
              },
              registrosAula: { where: { professorId }, select: { data: true } },
              avaliacoes: {
                where: { professorId },
                select: { id: true, notas: { select: { valor: true } } },
              },
            },
          },
        },
      },
    },
  })
  if (!professor) throw AppError.naoEncontrado('Professor')

  const turmasDoProfessor = professor.turmasAtribuidas.map((ta) => ta.turma)

  let aulasEsperadas = 0
  let aulasFeitas = 0
  let frequenciaEsperada = 0
  let frequenciaFeita = 0
  let avaliacoesTotal = 0
  let avaliacoesComNota = 0
  const pendencias: string[] = []

  for (const t of turmasDoProfessor) {
    aulasEsperadas += t.datasAula.length
    const datasComRegistro = new Set(t.registrosAula.map((r) => paraDataISO(r.data)))
    const aulasFeitasNaTurma = t.datasAula.filter((d) => datasComRegistro.has(paraDataISO(d.data))).length
    aulasFeitas += aulasFeitasNaTurma
    const semRegistro = t.datasAula.length - aulasFeitasNaTurma
    if (semRegistro > 0) pendencias.push(`${semRegistro} aula(s) sem registro em ${t.nome}`)

    frequenciaEsperada += t.datasAula.length
    const comFrequencia = t.datasAula.filter((d) =>
      d.frequencias.some((f) => f.presente !== null),
    ).length
    frequenciaFeita += comFrequencia
    const semFrequencia = t.datasAula.length - comFrequencia
    if (semFrequencia > 0) pendencias.push(`${semFrequencia} chamada(s) sem frequência lançada em ${t.nome}`)

    avaliacoesTotal += t.avaliacoes.length
    const avaliacoesComNotaNaTurma = t.avaliacoes.filter((a) => a.notas.some((n) => n.valor != null)).length
    avaliacoesComNota += avaliacoesComNotaNaTurma
    const semNota = t.avaliacoes.length - avaliacoesComNotaNaTurma
    if (semNota > 0) pendencias.push(`${semNota} avaliação(ões) sem nenhuma nota lançada em ${t.nome}`)
  }

  const [planos, alunosComDificuldade, observacoes] = await Promise.all([
    prisma.planoDeAula.findMany({
      where: { professorId, turma: { excluidoEm: null } },
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
      where: {
        turma: { professores: { some: { professorId } }, excluidoEm: null },
        excluidoEm: null,
        dificuldades: { not: null },
      },
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
    turmas: turmasDoProfessor.map((t) => ({ id: t.id, nome: t.nome })),
    registros: {
      aulas: { feitas: aulasFeitas, esperadas: aulasEsperadas },
      frequencia: { feitas: frequenciaFeita, esperadas: frequenciaEsperada },
      avaliacoes: { feitas: avaliacoesComNota, esperadas: avaliacoesTotal },
    },
    pendencias,
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

// Detalhe de uma turma pra coordenação — as 7 frentes que ela acompanha:
// Alunos, Frequência, Avaliações, Aulas, Professor(es), Atividades e
// Observações, tudo numa única chamada só.
export async function detalharTurma(turmaId: string) {
  const turma = await prisma.turma.findFirst({
    where: { id: turmaId, excluidoEm: null },
    select: {
      id: true,
      nome: true,
      serie: true,
      turno: true,
      escola: true,
      anoLetivo: true,
      professores: {
        select: {
          disciplina: true,
          professor: { select: { id: true, nome: true, email: true, materias: true } },
        },
      },
    },
  })
  if (!turma) throw AppError.naoEncontrado('Turma')

  const [alunos, avaliacoes, notas, aulasRecentes, planoAtivo, eventosAtividade, observacoes, percentuaisPorAluno] =
    await Promise.all([
      prisma.aluno.findMany({
        where: { turmaId, excluidoEm: null },
        select: { id: true, nome: true, dificuldades: true, situacao: true },
        orderBy: { nome: 'asc' },
      }),
      prisma.avaliacao.findMany({ where: { turmaId }, orderBy: { periodo: 'asc' } }),
      prisma.nota.findMany({ where: { avaliacao: { turmaId } } }),
      prisma.registroAula.findMany({ where: { turmaId }, orderBy: { data: 'desc' }, take: 5 }),
      prisma.planoDeAula.findFirst({ where: { turmaId }, orderBy: { criadoEm: 'desc' } }),
      prisma.evento.findMany({
        where: { turmaId, tipo: { in: ['prova', 'trabalho'] } },
        orderBy: { data: 'desc' },
        take: 10,
      }),
      prisma.observacaoPedagogica.findMany({
        where: { turmaId },
        orderBy: { criadoEm: 'desc' },
        include: { autor: { select: { nome: true } }, turma: { select: { nome: true } } },
      }),
      adminService.calcularFrequenciaPorAluno(),
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

  const alunosComFrequencia = alunos.map((a) => ({
    id: a.id,
    nome: a.nome,
    situacao: a.situacao,
    dificuldades: a.dificuldades,
    frequenciaPercentual: percentuaisPorAluno.get(a.id) ?? null,
  }))
  const percentuaisDaTurma = alunosComFrequencia
    .map((a) => a.frequenciaPercentual)
    .filter((v): v is number => v != null)
  const frequenciaMedia =
    percentuaisDaTurma.length > 0
      ? Math.round(percentuaisDaTurma.reduce((s, v) => s + v, 0) / percentuaisDaTurma.length)
      : null

  const todasAsNotas = notas.filter((n) => n.valor != null).map((n) => n.valor as number)
  const mediaTurma =
    todasAsNotas.length > 0
      ? Math.round((todasAsNotas.reduce((s, v) => s + v, 0) / todasAsNotas.length) * 10) / 10
      : null
  const tendencia = calcularTendencia(mediasPorAvaliacao)

  return {
    id: turma.id,
    nome: turma.nome,
    serie: turma.serie,
    turno: turma.turno,
    escola: turma.escola,
    anoLetivo: turma.anoLetivo,
    professores: turma.professores.map((tp) => ({ ...tp.professor, disciplina: tp.disciplina })),
    totalAlunos: alunos.filter((a) => a.situacao === 'ativo').length,
    frequenciaMedia,
    mediaTurma,
    alunos: alunosComFrequencia,
    mediasPorAvaliacao,
    tendencia,
    aulasRecentes: aulasRecentes.map((r) => ({ data: paraDataISO(r.data), resumo: r.resumo })),
    planoAtivo: planoAtivo
      ? {
          id: planoAtivo.id,
          titulo: planoAtivo.titulo,
          dataInicio: paraDataISO(planoAtivo.dataInicio),
          dataFim: paraDataISO(planoAtivo.dataFim),
        }
      : null,
    atividades: eventosAtividade.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      tipo: e.tipo,
      data: paraDataISO(e.data),
      concluido: e.concluido,
    })),
    observacoes: observacoes.map(serializarObservacao),
  }
}

// Reuniões/provas/trabalhos da escola inteira — calendário pedagógico da
// coordenação, ao contrário de /eventos (que só mostra os de quem está
// logado).
export async function listarEventosDaEscola() {
  const eventos = await prisma.evento.findMany({
    where: { tipo: { in: ['reuniao', 'prova', 'trabalho'] } },
    orderBy: { data: 'asc' },
    include: {
      turma: { select: { nome: true } },
      professor: { select: { nome: true } },
      _count: { select: { encaminhamentos: true } },
      encaminhamentos: { where: { concluido: false }, select: { id: true } },
    },
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
    totalEncaminhamentos: e._count.encaminhamentos,
    encaminhamentosAbertos: e.encaminhamentos.length,
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
      pauta: dados.pauta,
      participantes: dados.participantes,
    },
  })
  return { ...evento, data: paraDataISO(evento.data), prazo: paraDataISO(evento.prazo) }
}

function serializarEncaminhamento(e: {
  id: string
  texto: string
  concluido: boolean
  criadoEm: Date
  responsavel: { id: string; nome: string } | null
}) {
  return {
    id: e.id,
    texto: e.texto,
    concluido: e.concluido,
    criadoEm: e.criadoEm.toISOString(),
    responsavelId: e.responsavel?.id ?? null,
    responsavelNome: e.responsavel?.nome ?? null,
  }
}

// Detalhe completo de uma reunião — pauta, participantes, ata e os
// encaminhamentos combinados, pra abrir num drawer sem precisar buscar
// cada pedaço separado.
export async function detalharReuniao(eventoId: string) {
  const evento = await prisma.evento.findFirst({
    where: { id: eventoId, tipo: 'reuniao' },
    include: {
      turma: { select: { nome: true } },
      professor: { select: { nome: true } },
      encaminhamentos: {
        orderBy: { criadoEm: 'asc' },
        include: { responsavel: { select: { id: true, nome: true } } },
      },
    },
  })
  if (!evento) throw AppError.naoEncontrado('Reunião')

  return {
    id: evento.id,
    titulo: evento.titulo,
    data: paraDataISO(evento.data),
    hora: evento.hora,
    conteudo: evento.conteudo,
    concluido: evento.concluido,
    turmaNome: evento.turma?.nome ?? null,
    professorNome: evento.professor.nome,
    pauta: evento.pauta,
    participantes: evento.participantes,
    ata: evento.ata,
    encaminhamentos: evento.encaminhamentos.map(serializarEncaminhamento),
  }
}

export async function atualizarReuniao(eventoId: string, dados: AtualizarReuniaoDto) {
  const evento = await prisma.evento.findFirst({ where: { id: eventoId, tipo: 'reuniao' } })
  if (!evento) throw AppError.naoEncontrado('Reunião')

  await prisma.evento.update({
    where: { id: eventoId },
    data: {
      pauta: dados.pauta,
      participantes: dados.participantes,
      ata: dados.ata,
    },
  })
  return detalharReuniao(eventoId)
}

export async function criarEncaminhamento(eventoId: string, dados: CriarEncaminhamentoDto) {
  const evento = await prisma.evento.findFirst({ where: { id: eventoId, tipo: 'reuniao' } })
  if (!evento) throw AppError.naoEncontrado('Reunião')

  if (dados.responsavelId) {
    const responsavel = await prisma.professor.findUnique({ where: { id: dados.responsavelId } })
    if (!responsavel) throw AppError.naoEncontrado('Professor')
  }

  await prisma.encaminhamento.create({
    data: { eventoId, texto: dados.texto, responsavelId: dados.responsavelId ?? undefined },
  })
  return detalharReuniao(eventoId)
}

export async function alternarEncaminhamento(id: string) {
  const encaminhamento = await prisma.encaminhamento.findUnique({ where: { id } })
  if (!encaminhamento) throw AppError.naoEncontrado('Encaminhamento')

  await prisma.encaminhamento.update({
    where: { id },
    data: { concluido: !encaminhamento.concluido },
  })
  return detalharReuniao(encaminhamento.eventoId)
}

export async function removerEncaminhamento(id: string) {
  const encaminhamento = await prisma.encaminhamento.findUnique({ where: { id } })
  if (!encaminhamento) throw AppError.naoEncontrado('Encaminhamento')

  await prisma.encaminhamento.delete({ where: { id } })
  return detalharReuniao(encaminhamento.eventoId)
}

function serializarObservacao(o: {
  id: string
  texto: string
  tipo: 'comentario' | 'solicitacaoCorrecao'
  resolvida: boolean
  criadoEm: Date
  autor: { nome: string }
  professorAlvo?: { nome: string }
  turma: { nome: string } | null
}) {
  return {
    id: o.id,
    texto: o.texto,
    tipo: o.tipo,
    resolvida: o.resolvida,
    criadoEm: o.criadoEm.toISOString(),
    autorNome: o.autor.nome,
    professorAlvoNome: o.professorAlvo?.nome ?? null,
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
    include: {
      autor: { select: { nome: true } },
      professorAlvo: { select: { nome: true } },
      turma: { select: { nome: true } },
    },
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
      tipo: dados.tipo,
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

// O professor-alvo marca como resolvida uma solicitação de correção — só
// ele mesmo (não a coordenação, que "solicita" mas não "resolve" por ele).
export async function resolverObservacao(id: string, professorId: string) {
  const observacao = await prisma.observacaoPedagogica.findUnique({ where: { id } })
  if (!observacao || observacao.professorAlvoId !== professorId) {
    throw AppError.naoEncontrado('Observação')
  }
  const atualizada = await prisma.observacaoPedagogica.update({
    where: { id },
    data: { resolvida: true },
    include: { autor: { select: { nome: true } }, turma: { select: { nome: true } } },
  })
  return serializarObservacao(atualizada)
}

// Acompanhamento individual do aluno: a mesma pessoa costuma ter uma
// matrícula (Aluno) por turma — e cada turma aqui é uma disciplina com um
// professor — então "o aluno" de verdade é o conjunto de matrículas com o
// mesmo nome, na mesma escola e ano letivo. É uma aproximação por nome (o
// sistema não tem um cadastro único de pessoa entre turmas), mas é o que
// permite mostrar desempenho por matéria e não só nota de uma turma.
export async function detalharAluno(alunoId: string) {
  const base = await prisma.aluno.findFirst({
    where: { id: alunoId, excluidoEm: null },
    select: {
      id: true,
      nome: true,
      situacao: true,
      dificuldades: true,
      turma: { select: { id: true, nome: true, escola: true, anoLetivo: true } },
    },
  })
  if (!base) throw AppError.naoEncontrado('Aluno')

  const matriculas = await prisma.aluno.findMany({
    where: {
      excluidoEm: null,
      nome: base.nome,
      turma: { escola: base.turma.escola, anoLetivo: base.turma.anoLetivo, excluidoEm: null },
    },
    select: {
      id: true,
      dificuldades: true,
      turma: {
        select: {
          id: true,
          nome: true,
          professores: { select: { professorId: true, disciplina: true } },
        },
      },
    },
  })
  const idsMatriculas = matriculas.map((m) => m.id)

  const [percentuaisPorAluno, notasPorMatricula, acompanhamentos] = await Promise.all([
    adminService.calcularFrequenciaPorAluno(),
    prisma.nota.findMany({
      where: { alunoId: { in: idsMatriculas }, valor: { not: null } },
      select: { alunoId: true, valor: true, avaliacao: { select: { professorId: true } } },
    }),
    prisma.acompanhamentoAluno.findMany({
      where: { alunoId: { in: idsMatriculas } },
      orderBy: { criadoEm: 'desc' },
      include: { autor: { select: { nome: true } } },
    }),
  ])

  // Cada disciplina da turma (TurmaProfessor) vira uma linha de desempenho
  // própria — antes, com "1 turma = 1 professor", cada matrícula já era
  // uma disciplina só; agora uma turma pode ter várias, então agrupa as
  // notas por professor dentro de cada matrícula.
  const desempenho = matriculas.flatMap((m) =>
    m.turma.professores.map((tp) => {
      const notas = notasPorMatricula
        .filter((n) => n.alunoId === m.id && n.avaliacao.professorId === tp.professorId)
        .map((n) => n.valor as number)
      const media =
        notas.length > 0 ? Math.round((notas.reduce((s, v) => s + v, 0) / notas.length) * 10) / 10 : null
      return {
        turmaId: m.turma.id,
        materia: tp.disciplina,
        media,
      }
    }),
  )

  const percentuais = idsMatriculas
    .map((id) => percentuaisPorAluno.get(id))
    .filter((v): v is number => v != null)
  const frequenciaPercentual =
    percentuais.length > 0 ? Math.round(percentuais.reduce((s, v) => s + v, 0) / percentuais.length) : null

  const dificuldades = base.dificuldades ?? matriculas.find((m) => m.dificuldades)?.dificuldades ?? null

  return {
    id: base.id,
    nome: base.nome,
    situacao: base.situacao,
    turmaNome: base.turma.nome,
    frequenciaPercentual,
    desempenho,
    dificuldades,
    acompanhamentos: acompanhamentos.map((a) => ({
      id: a.id,
      texto: a.texto,
      criadoEm: a.criadoEm.toISOString(),
      autorNome: a.autor.nome,
    })),
  }
}

export async function criarAcompanhamento(alunoId: string, autorId: string, dados: CriarAcompanhamentoDto) {
  const aluno = await prisma.aluno.findFirst({ where: { id: alunoId, excluidoEm: null } })
  if (!aluno) throw AppError.naoEncontrado('Aluno')

  await prisma.acompanhamentoAluno.create({
    data: { alunoId, autorId, texto: dados.texto },
  })
  return detalharAluno(alunoId)
}

// Turma é da escola, não de um professor — criar/editar/excluir/promover
// e atribuir professores é papel da coordenação/diretoria daqui pra frente.
export function criarTurma(dados: CriarTurmaDto) {
  return prisma.turma.create({ data: dados, include: { professores: true } })
}

export async function atualizarTurma(turmaId: string, dados: AtualizarTurmaDto) {
  await turmaExistente(turmaId)
  return prisma.turma.update({ where: { id: turmaId }, data: dados, include: { professores: true } })
}

export async function removerTurma(turmaId: string) {
  await turmaExistente(turmaId)
  // Soft delete — os dados (alunos, notas, frequência...) continuam no
  // banco, só somem das telas.
  await prisma.turma.update({ where: { id: turmaId }, data: { excluidoEm: new Date() } })
}

async function turmaExistente(turmaId: string) {
  const turma = await prisma.turma.findFirst({ where: { id: turmaId, excluidoEm: null } })
  if (!turma) throw AppError.naoEncontrado('Turma')
  return turma
}

// Cria a turma do ano seguinte a partir de uma turma existente, copiando
// escola/sistema/cor/dias/professores e levando só os alunos ativos — a
// turma antiga não é alterada, continua intacta como histórico daquele ano.
export async function promoverTurma(turmaId: string, dados: PromoverTurmaDto) {
  const turmaAtual = await prisma.turma.findFirst({
    where: { id: turmaId, excluidoEm: null },
    include: { professores: true },
  })
  if (!turmaAtual) throw AppError.naoEncontrado('Turma')

  const alunosAtivos = await prisma.aluno.findMany({
    where: { turmaId, excluidoEm: null, situacao: 'ativo' },
  })

  return prisma.$transaction(async (tx) => {
    const novaTurma = await tx.turma.create({
      data: {
        nome: dados.nome,
        serie: dados.serie,
        anoLetivo: dados.anoLetivo,
        escola: turmaAtual.escola,
        sistemaPeriodo: turmaAtual.sistemaPeriodo,
        cor: turmaAtual.cor,
        diasAula: turmaAtual.diasAula,
        professores: {
          create: turmaAtual.professores.map((p) => ({
            professorId: p.professorId,
            disciplina: p.disciplina,
          })),
        },
      },
      include: { professores: true },
    })

    if (alunosAtivos.length > 0) {
      await tx.aluno.createMany({
        data: alunosAtivos.map((a) => ({
          nome: a.nome,
          email: a.email,
          telefonePais: a.telefonePais,
          matricula: a.matricula,
          dataNascimento: a.dataNascimento,
          situacao: 'ativo' as const,
          turmaId: novaTurma.id,
        })),
      })
    }

    const novosAlunos = await tx.aluno.findMany({ where: { turmaId: novaTurma.id } })
    return {
      turma: novaTurma,
      alunos: novosAlunos.map((a) => ({
        ...a,
        dataNascimento: paraDataISO(a.dataNascimento),
      })),
    }
  })
}

export async function atribuirProfessor(turmaId: string, dados: AtribuirProfessorDto) {
  await turmaExistente(turmaId)
  const professor = await prisma.professor.findUnique({ where: { id: dados.professorId } })
  if (!professor) throw AppError.naoEncontrado('Professor')

  const atribuicao = await prisma.turmaProfessor.upsert({
    where: { turmaId_professorId: { turmaId, professorId: dados.professorId } },
    update: { disciplina: dados.disciplina },
    create: { turmaId, professorId: dados.professorId, disciplina: dados.disciplina },
  })

  // Toda atribuição nova já ganha uma configuração de cálculo padrão —
  // mesmo comportamento de quando o professor criava a própria turma.
  await prisma.configCalculo.upsert({
    where: { turmaId_professorId: { turmaId, professorId: dados.professorId } },
    update: {},
    create: { turmaId, professorId: dados.professorId },
  })

  return atribuicao
}

// Remove só a atribuição — avaliações/notas/frequência/planos/registros
// desse professor nessa turma continuam no banco como histórico órfão de
// atribuição, mesma filosofia do soft delete de Turma.excluidoEm.
export async function removerProfessor(turmaId: string, professorId: string) {
  const atribuicao = await prisma.turmaProfessor.findUnique({
    where: { turmaId_professorId: { turmaId, professorId } },
  })
  if (!atribuicao) throw AppError.naoEncontrado('Atribuição')
  await prisma.turmaProfessor.delete({ where: { id: atribuicao.id } })
}
