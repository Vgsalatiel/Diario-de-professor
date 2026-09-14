import type { Evento } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { eventoDoProfessor, turmaDoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import type { AtualizarEventoDto, CriarEventoDto } from './eventos.dto'

function serializar(evento: Evento) {
  return { ...evento, data: paraDataISO(evento.data) }
}

export async function listarTodos(professorId: string) {
  const eventos = await prisma.evento.findMany({
    where: { professorId },
    orderBy: { data: 'asc' },
  })
  return eventos.map(serializar)
}

export async function criar(professorId: string, dados: CriarEventoDto) {
  if (dados.turmaId) await turmaDoProfessor(dados.turmaId, professorId)

  const evento = await prisma.evento.create({
    data: { ...dados, data: new Date(dados.data), professorId },
  })
  return serializar(evento)
}

export async function atualizar(eventoId: string, professorId: string, dados: AtualizarEventoDto) {
  await eventoDoProfessor(eventoId, professorId)
  if (dados.turmaId) await turmaDoProfessor(dados.turmaId, professorId)

  const evento = await prisma.evento.update({
    where: { id: eventoId },
    data: { ...dados, data: dados.data ? new Date(dados.data) : undefined },
  })
  return serializar(evento)
}

export async function remover(eventoId: string, professorId: string) {
  await eventoDoProfessor(eventoId, professorId)
  await prisma.evento.delete({ where: { id: eventoId } })
}
