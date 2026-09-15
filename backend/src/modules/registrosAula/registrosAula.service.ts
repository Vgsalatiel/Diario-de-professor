import type { RegistroAula } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { planoDoProfessor, turmaDoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import type { DefinirRegistroAulaDto } from './registrosAula.dto'

function serializar(registro: RegistroAula) {
  return { ...registro, data: paraDataISO(registro.data) }
}

// Todos os registros de aula ("o que foi aplicado no dia") do professor —
// o botão "Aula deste dia" da tela de Frequência procura aqui pela
// combinação turma + data.
export async function listarTodos(professorId: string) {
  const registros = await prisma.registroAula.findMany({
    where: { turma: { professorId } },
  })
  return registros.map(serializar)
}

// find-or-update por turma+data (equivalente a um "upsert").
export async function definir(
  turmaId: string,
  professorId: string,
  dados: DefinirRegistroAulaDto,
) {
  await turmaDoProfessor(turmaId, professorId)
  if (dados.planoId) await planoDoProfessor(dados.planoId, professorId)
  const data = new Date(dados.data)
  const planoId = dados.planoId ?? null

  const registro = await prisma.registroAula.upsert({
    where: { turmaId_data: { turmaId, data } },
    update: { resumo: dados.resumo, planoId },
    create: { turmaId, data, resumo: dados.resumo, planoId },
  })
  return serializar(registro)
}
