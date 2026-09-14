import type { Aluno } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { alunoDoProfessor, turmaDoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import type { AtualizarAlunoDto, CriarAlunoDto } from './alunos.dto'

function serializar(aluno: Aluno) {
  return { ...aluno, dataNascimento: paraDataISO(aluno.dataNascimento) }
}

// Todos os alunos de todas as turmas do professor — a tela de Alunos do
// frontend carrega tudo de uma vez e filtra por escola/turma no cliente.
export async function listarTodos(professorId: string) {
  const alunos = await prisma.aluno.findMany({
    where: { turma: { professorId } },
    orderBy: { nome: 'asc' },
  })
  return alunos.map(serializar)
}

export async function criar(turmaId: string, professorId: string, dados: CriarAlunoDto) {
  await turmaDoProfessor(turmaId, professorId)
  const aluno = await prisma.aluno.create({
    data: {
      ...dados,
      dataNascimento: dados.dataNascimento ? new Date(dados.dataNascimento) : undefined,
      turmaId,
    },
  })
  return serializar(aluno)
}

export async function atualizar(alunoId: string, professorId: string, dados: AtualizarAlunoDto) {
  await alunoDoProfessor(alunoId, professorId)
  const aluno = await prisma.aluno.update({
    where: { id: alunoId },
    data: {
      ...dados,
      dataNascimento: dados.dataNascimento ? new Date(dados.dataNascimento) : undefined,
    },
  })
  return serializar(aluno)
}

export async function remover(alunoId: string, professorId: string) {
  await alunoDoProfessor(alunoId, professorId)
  // Notas e frequência desse aluno somem junto (cascade do schema).
  await prisma.aluno.delete({ where: { id: alunoId } })
}
