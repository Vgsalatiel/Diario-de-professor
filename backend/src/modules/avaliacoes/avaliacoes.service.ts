import { prisma } from '../../lib/prisma'
import { avaliacaoDoProfessor, turmaDoProfessor } from '../../utils/ownership'
import type { AtualizarAvaliacaoDto, CriarAvaliacaoDto } from './avaliacoes.dto'

// Todas as avaliações de todas as turmas do professor.
export function listarTodas(professorId: string) {
  return prisma.avaliacao.findMany({
    where: { turma: { professorId } },
    orderBy: { nome: 'asc' },
  })
}

export async function criar(turmaId: string, professorId: string, dados: CriarAvaliacaoDto) {
  await turmaDoProfessor(turmaId, professorId)
  return prisma.avaliacao.create({ data: { ...dados, turmaId } })
}

export async function atualizar(
  avaliacaoId: string,
  professorId: string,
  dados: AtualizarAvaliacaoDto,
) {
  await avaliacaoDoProfessor(avaliacaoId, professorId)
  return prisma.avaliacao.update({ where: { id: avaliacaoId }, data: dados })
}

export async function remover(avaliacaoId: string, professorId: string) {
  await avaliacaoDoProfessor(avaliacaoId, professorId)
  // As notas dessa avaliação somem junto (cascade do schema).
  await prisma.avaliacao.delete({ where: { id: avaliacaoId } })
}
