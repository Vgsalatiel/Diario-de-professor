import { prisma } from '../../lib/prisma'
import { AppError } from '../../utils/AppError'
import { alunoDoProfessor, eventoDoProfessor, turmaDoProfessor } from '../../utils/ownership'

// Todas as entregas do professor — o frontend cruza com os eventos
// (prova/trabalho) igual faz hoje com o MapaDeFrequencia.
export function listarEntregas(professorId: string) {
  return prisma.entrega.findMany({
    where: { aluno: { excluidoEm: null }, evento: { professorId, turma: turmaDoProfessor(professorId) } },
  })
}

export async function definirEntrega(
  alunoId: string,
  eventoId: string,
  professorId: string,
  status: 'pendente' | 'feito' | 'naoEntregou',
) {
  const aluno = await alunoDoProfessor(alunoId, professorId)
  const evento = await eventoDoProfessor(eventoId, professorId)
  if (aluno.turmaId !== evento.turmaId) {
    throw AppError.requisicaoInvalida('Esse aluno não é da turma desse evento.')
  }

  return prisma.entrega.upsert({
    where: { alunoId_eventoId: { alunoId, eventoId } },
    update: { status },
    create: { alunoId, eventoId, status },
  })
}
