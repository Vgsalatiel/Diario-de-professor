import { prisma } from '../../lib/prisma'
import { turmaDoProfessor } from '../../utils/ownership'
import type { AtualizarConfigDto, AtualizarTurmaDto, CriarTurmaDto } from './turmas.dto'

const CONFIG_PADRAO = { modelo: 'simples' as const, mediaAprovacao: 6 }

export function listar(professorId: string) {
  return prisma.turma.findMany({
    where: { professorId },
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
  // O restante (alunos, avaliações, notas, datas de aula, frequência,
  // config) cai em cascata pelo próprio schema do Prisma.
  await prisma.turma.delete({ where: { id: turmaId } })
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
