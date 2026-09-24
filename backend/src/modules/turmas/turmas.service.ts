import type { Turma, TurmaProfessor } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../utils/AppError'
import { paraDataISO } from '../../utils/serializers'
import { turmaAtribuidaAoProfessor } from '../../utils/ownership'
import type { AtualizarConfigDto, AtualizarTurmaDto, CriarTurmaDto, PromoverTurmaDto } from './turmas.dto'

const CONFIG_PADRAO = { modelo: 'simples' as const, mediaAprovacao: 6, tipoAvaliacao: 'nota' as const }

// Forma que o frontend espera pra uma turma vista pelo professor logado:
// a disciplina/config dele mesmo já resolvidas (não precisa filtrar
// array), mais a lista completa de professores da turma.
function serializarTurma(
  turma: Turma & { professores: TurmaProfessor[] },
  professorId: string,
) {
  const atribuicao = turma.professores.find((p) => p.professorId === professorId)
  return {
    ...turma,
    disciplina: atribuicao?.disciplina ?? null,
    professores: turma.professores.map((p) => ({
      professorId: p.professorId,
      disciplina: p.disciplina,
    })),
  }
}

// Turmas em que o professor está atribuído (via TurmaProfessor) — cada
// turma já vem com a disciplina e a config de cálculo dele mesmo nessa
// turma, pra não obrigar a tela a filtrar/cruzar arrays.
export async function listar(professorId: string) {
  const atribuicoes = await prisma.turmaProfessor.findMany({
    where: { professorId, turma: { excluidoEm: null } },
    include: { turma: { include: { professores: true, configs: true } } },
    orderBy: { turma: { nome: 'asc' } },
  })

  return atribuicoes.map(({ turma }) => ({
    ...serializarTurma(turma, professorId),
    config: turma.configs.find((c) => c.professorId === professorId) ?? {
      turmaId: turma.id,
      professorId,
      ...CONFIG_PADRAO,
    },
  }))
}

export async function buscarConfig(turmaId: string, professorId: string) {
  await turmaAtribuidaAoProfessor(turmaId, professorId)
  const config = await prisma.configCalculo.findUnique({
    where: { turmaId_professorId: { turmaId, professorId } },
  })
  return config ?? { turmaId, professorId, ...CONFIG_PADRAO }
}

export async function atualizarConfig(
  turmaId: string,
  professorId: string,
  dados: AtualizarConfigDto,
) {
  await turmaAtribuidaAoProfessor(turmaId, professorId)
  return prisma.configCalculo.upsert({
    where: { turmaId_professorId: { turmaId, professorId } },
    update: dados,
    create: { turmaId, professorId, ...CONFIG_PADRAO, ...dados },
  })
}

// Professor sem escola por trás (dá aula em lugares diferentes, não tem
// coordenação nenhuma) continua podendo criar a própria turma, como
// sempre foi — ele nasce como o único professor atribuído a ela, dono de
// fato. Numa escola de verdade, é a coordenação que assume esse papel via
// /coordenacao/turmas; as duas formas convivem no mesmo sistema.
export async function criar(professorId: string, dados: CriarTurmaDto) {
  const { disciplina, ...dadosTurma } = dados
  const turma = await prisma.turma.create({
    data: {
      ...dadosTurma,
      professores: {
        create: { professorId, disciplina: disciplina?.trim() || 'Geral' },
      },
      configs: { create: { professorId, ...CONFIG_PADRAO } },
    },
    include: { professores: true, configs: true },
  })
  return {
    ...serializarTurma(turma, professorId),
    config: turma.configs[0],
  }
}

export async function atualizar(turmaId: string, professorId: string, dados: AtualizarTurmaDto) {
  await turmaAtribuidaAoProfessor(turmaId, professorId)
  const { disciplina, ...dadosTurma } = dados
  if (disciplina !== undefined) {
    await prisma.turmaProfessor.update({
      where: { turmaId_professorId: { turmaId, professorId } },
      data: { disciplina: disciplina?.trim() || 'Geral' },
    })
  }
  const [turma, config] = await Promise.all([
    prisma.turma.update({ where: { id: turmaId }, data: dadosTurma, include: { professores: true } }),
    prisma.configCalculo.findUnique({ where: { turmaId_professorId: { turmaId, professorId } } }),
  ])
  return {
    ...serializarTurma(turma, professorId),
    config: config ?? { turmaId, professorId, ...CONFIG_PADRAO },
  }
}

// Só deixa excluir quando o professor é o único atribuído — turma
// compartilhada com outro professor (atribuída pela coordenação) exige
// que seja a coordenação a remover, pra não sumir os dados de outro
// professor sem ele saber.
export async function remover(turmaId: string, professorId: string) {
  const turma = await turmaAtribuidaAoProfessor(turmaId, professorId)
  const totalProfessores = await prisma.turmaProfessor.count({ where: { turmaId } })
  if (totalProfessores > 1) {
    throw AppError.requisicaoInvalida(
      'Essa turma tem mais de um professor — peça pra coordenação remover ela.',
    )
  }
  await prisma.turma.update({ where: { id: turma.id }, data: { excluidoEm: new Date() } })
}

// Cria a turma do ano seguinte a partir de uma turma existente, copiando
// escola/sistema/cor/dias e levando só os alunos ativos — a turma antiga
// não é alterada, continua intacta como histórico daquele ano. O
// professor que promove vira o único professor atribuído à turma nova
// (mesmo que a turma atual tivesse mais gente — cada um promove a sua).
export async function promover(turmaId: string, professorId: string, dados: PromoverTurmaDto) {
  const turmaAtual = await turmaAtribuidaAoProfessor(turmaId, professorId)
  const atribuicaoAtual = await prisma.turmaProfessor.findUniqueOrThrow({
    where: { turmaId_professorId: { turmaId, professorId } },
  })

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
        professores: { create: { professorId, disciplina: atribuicaoAtual.disciplina } },
        configs: { create: { professorId, ...CONFIG_PADRAO } },
      },
      include: { professores: true, configs: true },
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
      turma: { ...serializarTurma(novaTurma, professorId), config: novaTurma.configs[0] },
      alunos: novosAlunos.map((a) => ({
        ...a,
        dataNascimento: paraDataISO(a.dataNascimento),
      })),
    }
  })
}
