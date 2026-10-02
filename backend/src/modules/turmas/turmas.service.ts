import type { Turma, TurmaProfessor } from '@prisma/client'
import { prisma } from '../../lib/prisma'
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

// O Diário é pessoal: cada turma pertence a um único professor, quem a
// criou — ele nasce como o único registro de TurmaProfessor dela.
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

export async function remover(turmaId: string, professorId: string) {
  const turma = await turmaAtribuidaAoProfessor(turmaId, professorId)
  await prisma.turma.update({ where: { id: turma.id }, data: { excluidoEm: new Date() } })
}

// Cria a turma do ano seguinte a partir de uma turma existente, copiando
// escola/sistema/cor/dias e levando só os alunos ativos — a turma antiga
// não é alterada, continua intacta como histórico daquele ano.
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
