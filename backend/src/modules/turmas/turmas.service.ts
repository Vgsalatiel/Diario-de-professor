import { prisma } from '../../lib/prisma'
import { turmaAtribuidaAoProfessor } from '../../utils/ownership'
import type { AtualizarConfigDto } from './turmas.dto'

const CONFIG_PADRAO = { modelo: 'simples' as const, mediaAprovacao: 6, tipoAvaliacao: 'nota' as const }

// Turmas em que o professor está atribuído (via TurmaProfessor) — cada
// turma já vem com a disciplina e a config de cálculo dele mesmo nessa
// turma, pra não obrigar a tela a filtrar/cruzar arrays. Somente leitura:
// criar/editar/excluir turma e atribuir professores é coisa da coordenação.
export async function listar(professorId: string) {
  const atribuicoes = await prisma.turmaProfessor.findMany({
    where: { professorId, turma: { excluidoEm: null } },
    include: { turma: { include: { professores: true, configs: true } } },
    orderBy: { turma: { nome: 'asc' } },
  })

  return atribuicoes.map(({ turma, disciplina }) => ({
    ...turma,
    disciplina,
    professores: turma.professores.map((p) => ({
      professorId: p.professorId,
      disciplina: p.disciplina,
    })),
    config: turma.configs.find((c) => c.professorId === professorId) ?? {
      turmaId: turma.id,
      professorId,
      ...CONFIG_PADRAO,
    },
    configs: undefined,
  }))
}

export async function buscarConfig(turmaId: string, professorId: string) {
  await turmaAtribuidaAoProfessor(turmaId, professorId)
  const config = await prisma.configCalculo.findUnique({
    where: { turmaId_professorId: { turmaId, professorId } },
  })
  return config ?? { turmaId, professorId, ...CONFIG_PADRAO }
}

export async function atualizarConfig(
  turmaId: string,
  professorId: string,
  dados: AtualizarConfigDto,
) {
  await turmaAtribuidaAoProfessor(turmaId, professorId)
  return prisma.configCalculo.upsert({
    where: { turmaId_professorId: { turmaId, professorId } },
    update: dados,
    create: { turmaId, professorId, ...CONFIG_PADRAO, ...dados },
  })
}
