import type { PlanoDeAula } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { planoDoProfessor, turmaDoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import type { AtualizarPlanoDto, CriarPlanoDto } from './planos.dto'

function serializar(plano: PlanoDeAula) {
  return {
    ...plano,
    dataInicio: paraDataISO(plano.dataInicio),
    dataFim: paraDataISO(plano.dataFim),
  }
}

// Todos os planos de aula de todas as turmas do professor.
export async function listarTodos(professorId: string) {
  const planos = await prisma.planoDeAula.findMany({
    where: { turma: { professorId } },
    orderBy: { dataInicio: 'desc' },
  })
  return planos.map(serializar)
}

export async function criar(turmaId: string, professorId: string, dados: CriarPlanoDto) {
  await turmaDoProfessor(turmaId, professorId)
  const plano = await prisma.planoDeAula.create({
    data: {
      ...dados,
      dataInicio: new Date(dados.dataInicio),
      dataFim: new Date(dados.dataFim),
      turmaId,
    },
  })
  return serializar(plano)
}

export async function atualizar(planoId: string, professorId: string, dados: AtualizarPlanoDto) {
  await planoDoProfessor(planoId, professorId)
  const plano = await prisma.planoDeAula.update({
    where: { id: planoId },
    data: {
      ...dados,
      dataInicio: dados.dataInicio ? new Date(dados.dataInicio) : undefined,
      dataFim: dados.dataFim ? new Date(dados.dataFim) : undefined,
    },
  })
  return serializar(plano)
}

export async function remover(planoId: string, professorId: string) {
  await planoDoProfessor(planoId, professorId)
  // Provas (eventos) e registros de aula ligados a esse plano perdem o
  // vínculo (SetNull) ou somem, conforme o schema.
  await prisma.planoDeAula.delete({ where: { id: planoId } })
}
