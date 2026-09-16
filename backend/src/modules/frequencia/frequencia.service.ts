import type { DataAula } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { alunoDoProfessor, dataAulaDoProfessor, turmaDoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import type { GarantirDataAulaDto } from './frequencia.dto'

function serializarDataAula(dataAula: DataAula) {
  return { ...dataAula, data: paraDataISO(dataAula.data) }
}

// Todas as datas de aula / frequência do professor — o frontend calcula
// presença e falta em cima dessas listas planas.
export async function listarDatasAula(professorId: string) {
  const datas = await prisma.dataAula.findMany({
    where: { turma: { professorId, excluidoEm: null } },
  })
  return datas.map(serializarDataAula)
}

export function listarFrequencia(professorId: string) {
  return prisma.frequencia.findMany({
    where: { aluno: { excluidoEm: null, turma: { professorId, excluidoEm: null } } },
  })
}

// find-or-create — equivalente ao garantirDataAula() do frontend.
export async function garantirDataAula(
  turmaId: string,
  professorId: string,
  dados: GarantirDataAulaDto,
) {
  await turmaDoProfessor(turmaId, professorId)
  const data = new Date(dados.data)

  const existente = await prisma.dataAula.findUnique({
    where: { turmaId_data: { turmaId, data } },
  })
  if (existente) return serializarDataAula(existente)

  const criado = await prisma.dataAula.create({
    data: { turmaId, data, periodo: dados.periodo },
  })
  return serializarDataAula(criado)
}

// find-or-create-e-alterna — equivalente ao alternarSemAula() do frontend.
export async function alternarSemAula(
  turmaId: string,
  professorId: string,
  dados: GarantirDataAulaDto,
) {
  await turmaDoProfessor(turmaId, professorId)
  const data = new Date(dados.data)

  const existente = await prisma.dataAula.findUnique({
    where: { turmaId_data: { turmaId, data } },
  })

  if (existente) {
    const atualizado = await prisma.dataAula.update({
      where: { id: existente.id },
      data: { semAula: !existente.semAula },
    })
    return serializarDataAula(atualizado)
  }

  const criado = await prisma.dataAula.create({
    data: { turmaId, data, periodo: dados.periodo, semAula: true },
  })
  return serializarDataAula(criado)
}

export async function definirPresenca(
  alunoId: string,
  dataAulaId: string,
  professorId: string,
  presente: boolean | null,
) {
  await alunoDoProfessor(alunoId, professorId)
  await dataAulaDoProfessor(dataAulaId, professorId)

  return prisma.frequencia.upsert({
    where: { alunoId_dataAulaId: { alunoId, dataAulaId } },
    update: { presente },
    create: { alunoId, dataAulaId, presente },
  })
}
