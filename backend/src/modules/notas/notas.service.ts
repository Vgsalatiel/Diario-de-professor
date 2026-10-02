import { prisma } from '../../lib/prisma'
import { AppError } from '../../utils/AppError'
import { alunoDoProfessor, avaliacaoDoProfessor, turmaDoProfessor } from '../../utils/ownership'
import type { DefinirNotaDto } from './notas.dto'

// Todas as notas de todos os alunos do professor — o frontend monta o
// "mapa" (aluno::avaliação -> valor/conceito) a partir dessa lista.
export function listarTodas(professorId: string) {
  return prisma.nota.findMany({
    where: { aluno: { excluidoEm: null }, avaliacao: { professorId, turma: turmaDoProfessor(professorId) } },
  })
}

export async function definir(
  alunoId: string,
  avaliacaoId: string,
  professorId: string,
  dados: DefinirNotaDto,
) {
  const aluno = await alunoDoProfessor(alunoId, professorId)
  const avaliacao = await avaliacaoDoProfessor(avaliacaoId, professorId)
  if (aluno.turmaId !== avaliacao.turmaId) {
    throw AppError.requisicaoInvalida('Esse aluno não é da turma dessa avaliação.')
  }

  // Turma por conceito só aceita conceito, e por nota só aceita número —
  // senão as duas coisas se misturam na mesma avaliação.
  const config = await prisma.configCalculo.findUnique({
    where: { turmaId_professorId: { turmaId: avaliacao.turmaId, professorId } },
    select: { tipoAvaliacao: true },
  })
  const tipo = config?.tipoAvaliacao ?? 'nota'
  if (tipo === 'nota' && dados.conceito !== undefined) {
    throw AppError.requisicaoInvalida('Essa turma usa nota numérica, não conceito.')
  }
  if (tipo === 'conceito' && dados.valor !== undefined) {
    throw AppError.requisicaoInvalida('Essa turma usa conceito, não nota numérica.')
  }

  // Só grava o campo que veio na requisição.
  const data: { valor?: number | null; conceito?: string | null } = {}
  if (dados.valor !== undefined) data.valor = dados.valor
  if (dados.conceito !== undefined) data.conceito = dados.conceito

  return prisma.nota.upsert({
    where: { alunoId_avaliacaoId: { alunoId, avaliacaoId } },
    update: data,
    create: { alunoId, avaliacaoId, ...data },
  })
}
