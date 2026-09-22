import { prisma } from '../../lib/prisma'
import { alunoDoProfessor, avaliacaoDoProfessor } from '../../utils/ownership'
import type { DefinirNotaDto } from './notas.dto'

// Todas as notas de todos os alunos do professor — o frontend monta o
// "mapa" (aluno::avaliação -> valor/conceito) a partir dessa lista.
export function listarTodas(professorId: string) {
  return prisma.nota.findMany({
    where: { aluno: { excluidoEm: null, turma: { professorId, excluidoEm: null } } },
  })
}

export async function definir(
  alunoId: string,
  avaliacaoId: string,
  professorId: string,
  dados: DefinirNotaDto,
) {
  await alunoDoProfessor(alunoId, professorId)
  await avaliacaoDoProfessor(avaliacaoId, professorId)

  // Só grava o campo que veio na requisição — o frontend manda "valor" ou
  // "conceito", nunca os dois, conforme o tipo de avaliação da turma.
  const data: { valor?: number | null; conceito?: string | null } = {}
  if (dados.valor !== undefined) data.valor = dados.valor
  if (dados.conceito !== undefined) data.conceito = dados.conceito

  return prisma.nota.upsert({
    where: { alunoId_avaliacaoId: { alunoId, avaliacaoId } },
    update: data,
    create: { alunoId, avaliacaoId, ...data },
  })
}
