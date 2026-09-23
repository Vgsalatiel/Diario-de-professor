import { prisma } from '../../lib/prisma'
import { avaliacaoDoProfessor, turmaAtribuidaAoProfessor } from '../../utils/ownership'
import type { AtualizarAvaliacaoDto, CriarAvaliacaoDto } from './avaliacoes.dto'

// Todas as avaliações do professor, em todas as turmas em que dá aula —
// só as dele mesmo, já que agora cada disciplina tem suas próprias.
export function listarTodas(professorId: string) {
  return prisma.avaliacao.findMany({
    where: { professorId, turma: { excluidoEm: null } },
    orderBy: { nome: 'asc' },
  })
}

export async function criar(turmaId: string, professorId: string, dados: CriarAvaliacaoDto) {
  await turmaAtribuidaAoProfessor(turmaId, professorId)
  return prisma.avaliacao.create({ data: { ...dados, turmaId, professorId } })
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
