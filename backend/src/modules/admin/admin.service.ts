import { prisma } from '../../lib/prisma'
import { AppError } from '../../utils/AppError'

export async function listarProfessores() {
  const professores = await prisma.professor.findMany({
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      email: true,
      materias: true,
      isAdmin: true,
      criadoEm: true,
      _count: { select: { turmas: true } },
    },
  })

  return professores.map((p) => ({
    id: p.id,
    nome: p.nome,
    email: p.email,
    materias: p.materias,
    isAdmin: p.isAdmin,
    criadoEm: p.criadoEm.toISOString(),
    totalTurmas: p._count.turmas,
  }))
}

export async function excluirProfessor(professorId: string, quemPediuId: string) {
  if (professorId === quemPediuId) {
    throw AppError.requisicaoInvalida('Você não pode excluir a própria conta enquanto estiver logado nela.')
  }

  const professor = await prisma.professor.findUnique({ where: { id: professorId } })
  if (!professor) throw AppError.naoEncontrado('Professor')

  // Cascade do schema já apaga turmas, alunos, notas, eventos, planos etc.
  await prisma.professor.delete({ where: { id: professorId } })
}
