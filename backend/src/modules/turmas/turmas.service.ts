import { prisma } from '../../lib/prisma'
import { turmaDoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import type {
  AtualizarConfigDto,
  AtualizarTurmaDto,
  CriarTurmaDto,
  PromoverTurmaDto,
} from './turmas.dto'

const CONFIG_PADRAO = { modelo: 'simples' as const, mediaAprovacao: 6, tipoAvaliacao: 'nota' as const }

export function listar(professorId: string) {
  return prisma.turma.findMany({
    where: { professorId, excluidoEm: null },
    include: { config: true },
    orderBy: { nome: 'asc' },
  })
}

export function criar(professorId: string, dados: CriarTurmaDto) {
  // Toda turma nova já nasce com uma configuração de cálculo padrão —
  // mesmo comportamento do criarTurma() no frontend hoje.
  return prisma.turma.create({
    data: { ...dados, professorId, config: { create: CONFIG_PADRAO } },
    include: { config: true },
  })
}

export async function atualizar(turmaId: string, professorId: string, dados: AtualizarTurmaDto) {
  await turmaDoProfessor(turmaId, professorId)
  return prisma.turma.update({ where: { id: turmaId }, data: dados, include: { config: true } })
}

export async function remover(turmaId: string, professorId: string) {
  await turmaDoProfessor(turmaId, professorId)
  // Soft delete — os dados (alunos, notas, frequência...) continuam no
  // banco, só somem das telas. Dá pra recuperar direto no banco se precisar.
  await prisma.turma.update({ where: { id: turmaId }, data: { excluidoEm: new Date() } })
}

// Cria a turma do ano seguinte a partir de uma turma existente, copiando
// escola/sistema/cor/dias e levando só os alunos ativos — a turma antiga
// não é alterada, continua intacta como histórico daquele ano.
export async function promover(turmaId: string, professorId: string, dados: PromoverTurmaDto) {
  const turmaAtual = await turmaDoProfessor(turmaId, professorId)

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
        professorId,
        config: { create: CONFIG_PADRAO },
      },
      include: { config: true },
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

export async function buscarConfig(turmaId: string, professorId: string) {
  await turmaDoProfessor(turmaId, professorId)
  const config = await prisma.configCalculo.findUnique({ where: { turmaId } })
  return config ?? { turmaId, ...CONFIG_PADRAO }
}

export async function atualizarConfig(
  turmaId: string,
  professorId: string,
  dados: AtualizarConfigDto,
) {
  await turmaDoProfessor(turmaId, professorId)
  return prisma.configCalculo.upsert({
    where: { turmaId },
    update: dados,
    create: { turmaId, ...CONFIG_PADRAO, ...dados },
  })
}
