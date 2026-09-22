import { prisma } from '../../lib/prisma'
import { alunoDoProfessor, eventoDoProfessor } from '../../utils/ownership'

// Todas as entregas do professor — o frontend cruza com os eventos
// (prova/trabalho) igual faz hoje com o MapaDeFrequencia.
export function listarEntregas(professorId: string) {
  return prisma.entrega.findMany({
    where: { aluno: { excluidoEm: null, turma: { professorId, excluidoEm: null } } },
  })
}

export async function definirEntrega(
  alunoId: string,
  eventoId: string,
  professorId: string,
  status: 'pendente' | 'feito' | 'naoEntregou',
) {
  await alunoDoProfessor(alunoId, professorId)
  await eventoDoProfessor(eventoId, professorId)

  return prisma.entrega.upsert({
    where: { alunoId_eventoId: { alunoId, eventoId } },
    update: { status },
    create: { alunoId, eventoId, status },
  })
}
