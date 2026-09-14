import { prisma } from '../../lib/prisma'
import { alunoDoProfessor, avaliacaoDoProfessor } from '../../utils/ownership'

// Todas as notas de todos os alunos do professor — o frontend monta o
// "mapa" (aluno::avaliação -> valor) a partir dessa lista.
export function listarTodas(professorId: string) {
  return prisma.nota.findMany({ where: { aluno: { turma: { professorId } } } })
}

export async function definir(
  alunoId: string,
  avaliacaoId: string,
  professorId: string,
  valor: number | null,
) {
  await alunoDoProfessor(alunoId, professorId)
  await avaliacaoDoProfessor(avaliacaoId, professorId)

  return prisma.nota.upsert({
    where: { alunoId_avaliacaoId: { alunoId, avaliacaoId } },
    update: { valor },
    create: { alunoId, avaliacaoId, valor },
  })
}
