import type { Evento } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { eventoDoProfessor, planoDoProfessor, turmaAtribuidaAoProfessor, turmaDoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import { AppError } from '../../utils/AppError'
import type { AtualizarEventoDto, CriarEventoDto } from './eventos.dto'

function serializar(evento: Evento) {
  return { ...evento, data: paraDataISO(evento.data), prazo: paraDataISO(evento.prazo) }
}

export async function listarTodos(professorId: string) {
  const eventos = await prisma.evento.findMany({
    // Meus eventos avulsos (sem turma) e os das minhas turmas.
    where: { professorId, OR: [{ turmaId: null }, { turma: turmaDoProfessor(professorId) }] },
    orderBy: { data: 'asc' },
  })
  return eventos.map(serializar)
}

// Prova/atividade ligada a um plano de aula tem que ser da mesma turma
// do plano — senão apareceria nas Notas/Agenda de uma turma e no plano
// de outra.
async function conferirPlano(planoId: string | null | undefined, turmaId: string | null | undefined, professorId: string) {
  if (!planoId) return
  const plano = await planoDoProfessor(planoId, professorId)
  if (plano.turmaId !== turmaId) {
    throw AppError.requisicaoInvalida('Esse evento está ligado a um plano de aula de outra turma.')
  }
}

export async function criar(professorId: string, dados: CriarEventoDto) {
  if (dados.turmaId) await turmaAtribuidaAoProfessor(dados.turmaId, professorId)
  await conferirPlano(dados.planoId, dados.turmaId, professorId)

  const evento = await prisma.evento.create({
    data: {
      ...dados,
      data: new Date(dados.data),
      prazo: dados.prazo ? new Date(dados.prazo) : null,
      professorId,
    },
  })
  return serializar(evento)
}

export async function atualizar(eventoId: string, professorId: string, dados: AtualizarEventoDto) {
  const atual = await eventoDoProfessor(eventoId, professorId)
  const turmaFinal = dados.turmaId !== undefined ? dados.turmaId : atual.turmaId
  const planoFinal = dados.planoId !== undefined ? dados.planoId : atual.planoId
  if (dados.turmaId) await turmaAtribuidaAoProfessor(dados.turmaId, professorId)
  if (dados.turmaId !== undefined || dados.planoId !== undefined) {
    await conferirPlano(planoFinal, turmaFinal, professorId)
  }

  const evento = await prisma.$transaction(async (tx) => {
    // Trocou (ou tirou) a turma: as entregas dos alunos da turma antiga
    // não fazem mais sentido nesse evento.
    if (turmaFinal !== atual.turmaId) {
      await tx.entrega.deleteMany({
        where: { eventoId, ...(turmaFinal ? { aluno: { turmaId: { not: turmaFinal } } } : {}) },
      })
    }
    return tx.evento.update({
      where: { id: eventoId },
      data: {
        ...dados,
        data: dados.data ? new Date(dados.data) : undefined,
        prazo: dados.prazo === undefined ? undefined : dados.prazo ? new Date(dados.prazo) : null,
      },
    })
  })
  return serializar(evento)
}

export async function remover(eventoId: string, professorId: string) {
  await eventoDoProfessor(eventoId, professorId)
  await prisma.evento.delete({ where: { id: eventoId } })
}
