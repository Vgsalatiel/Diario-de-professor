// Toda entidade "de baixo" (aluno, avaliação, evento, data de aula...)
// pertence a uma turma, que pertence a um professor. Essas funções
// garantem que o professor logado só acessa o que é dele — devolvem a
// linha encontrada, ou lançam 404 (propositalmente não é 403: não
// revelamos se o registro existe e é de outro professor).
import { prisma } from '../lib/prisma'
import { AppError } from './AppError'

// Turma/aluno excluídos (soft delete) contam como "não encontrados" pra
// qualquer operação — igual seriam se tivessem sido apagados de verdade.
export async function turmaDoProfessor(turmaId: string, professorId: string) {
  const turma = await prisma.turma.findUnique({ where: { id: turmaId } })
  if (!turma || turma.professorId !== professorId || turma.excluidoEm) {
    throw AppError.naoEncontrado('Turma')
  }
  return turma
}

export async function alunoDoProfessor(alunoId: string, professorId: string) {
  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    include: { turma: true },
  })
  if (
    !aluno ||
    aluno.turma.professorId !== professorId ||
    aluno.excluidoEm ||
    aluno.turma.excluidoEm
  ) {
    throw AppError.naoEncontrado('Aluno')
  }
  return aluno
}

export async function avaliacaoDoProfessor(avaliacaoId: string, professorId: string) {
  const avaliacao = await prisma.avaliacao.findUnique({
    where: { id: avaliacaoId },
    include: { turma: true },
  })
  if (
    !avaliacao ||
    avaliacao.turma.professorId !== professorId ||
    avaliacao.turma.excluidoEm
  ) {
    throw AppError.naoEncontrado('Avaliação')
  }
  return avaliacao
}

export async function dataAulaDoProfessor(dataAulaId: string, professorId: string) {
  const dataAula = await prisma.dataAula.findUnique({
    where: { id: dataAulaId },
    include: { turma: true },
  })
  if (
    !dataAula ||
    dataAula.turma.professorId !== professorId ||
    dataAula.turma.excluidoEm
  ) {
    throw AppError.naoEncontrado('Data de aula')
  }
  return dataAula
}

export async function eventoDoProfessor(eventoId: string, professorId: string) {
  const evento = await prisma.evento.findUnique({ where: { id: eventoId } })
  if (!evento || evento.professorId !== professorId) throw AppError.naoEncontrado('Evento')
  return evento
}

export async function planoDoProfessor(planoId: string, professorId: string) {
  const plano = await prisma.planoDeAula.findUnique({
    where: { id: planoId },
    include: { turma: true },
  })
  if (!plano || plano.turma.professorId !== professorId || plano.turma.excluidoEm) {
    throw AppError.naoEncontrado('Plano de aula')
  }
  return plano
}
