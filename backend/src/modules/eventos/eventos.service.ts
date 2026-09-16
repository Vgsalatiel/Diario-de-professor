import type { Evento } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { eventoDoProfessor, planoDoProfessor, turmaDoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import type { AtualizarEventoDto, CriarEventoDto } from './eventos.dto'

function serializar(evento: Evento) {
  return { ...evento, data: paraDataISO(evento.data), prazo: paraDataISO(evento.prazo) }
}

export async function listarTodos(professorId: string) {
  const eventos = await prisma.evento.findMany({
    where: { professorId, OR: [{ turmaId: null }, { turma: { excluidoEm: null } }] },
    orderBy: { data: 'asc' },
  })
  return eventos.map(serializar)
}

export async function criar(professorId: string, dados: CriarEventoDto) {
  if (dados.turmaId) await turmaDoProfessor(dados.turmaId, professorId)
  if (dados.planoId) await planoDoProfessor(dados.planoId, professorId)

  const evento = await prisma.evento.create({
    data: {
      ...dados,
      data: new Date(dados.data),
      prazo: dados.prazo ? new Date(dados.prazo) : undefined,
      professorId,
    },
  })
  return serializar(evento)
}

export async function atualizar(eventoId: string, professorId: string, dados: AtualizarEventoDto) {
  await eventoDoProfessor(eventoId, professorId)
  if (dados.turmaId) await turmaDoProfessor(dados.turmaId, professorId)
  if (dados.planoId) await planoDoProfessor(dados.planoId, professorId)

  const evento = await prisma.evento.update({
    where: { id: eventoId },
    data: {
      ...dados,
      data: dados.data ? new Date(dados.data) : undefined,
      prazo: dados.prazo ? new Date(dados.prazo) : undefined,
    },
  })
  return serializar(evento)
}

export async function remover(eventoId: string, professorId: string) {
  await eventoDoProfessor(eventoId, professorId)
  await prisma.evento.delete({ where: { id: eventoId } })
}
