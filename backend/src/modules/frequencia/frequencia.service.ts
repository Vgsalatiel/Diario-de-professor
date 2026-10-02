import type { DataAula } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../utils/AppError'
import { alunoDoProfessor, dataAulaDoProfessor, turmaAtribuidaAoProfessor, turmaDoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import type { GarantirDataAulaDto } from './frequencia.dto'

function serializarDataAula(dataAula: DataAula) {
  return { ...dataAula, data: paraDataISO(dataAula.data) }
}

// Todas as datas de aula / frequência do professor — o frontend calcula
// presença e falta em cima dessas listas planas.
export async function listarDatasAula(professorId: string) {
  const datas = await prisma.dataAula.findMany({
    where: { professorId, turma: turmaDoProfessor(professorId) },
  })
  return datas.map(serializarDataAula)
}

export function listarFrequencia(professorId: string) {
  return prisma.frequencia.findMany({
    where: { aluno: { excluidoEm: null }, dataAula: { professorId, turma: turmaDoProfessor(professorId) } },
  })
}

// find-or-create — equivalente ao garantirDataAula() do frontend.
export async function garantirDataAula(
  turmaId: string,
  professorId: string,
  dados: GarantirDataAulaDto,
) {
  await turmaAtribuidaAoProfessor(turmaId, professorId)
  const data = new Date(dados.data)

  // upsert em vez de buscar-e-criar: dois cliques seguidos num dia novo
  // chegam quase juntos e o segundo batia no @@unique.
  const dataAula = await prisma.dataAula.upsert({
    where: { turmaId_professorId_data: { turmaId, professorId, data } },
    update: {},
    create: { turmaId, professorId, data, periodo: dados.periodo },
  })
  return serializarDataAula(dataAula)
}

// find-or-create-e-alterna — equivalente ao alternarSemAula() do frontend.
export async function alternarSemAula(
  turmaId: string,
  professorId: string,
  dados: GarantirDataAulaDto,
) {
  await turmaAtribuidaAoProfessor(turmaId, professorId)
  const data = new Date(dados.data)

  const existente = await prisma.dataAula.findUnique({
    where: { turmaId_professorId_data: { turmaId, professorId, data } },
  })

  if (existente) {
    const atualizado = await prisma.dataAula.update({
      where: { id: existente.id },
      data: { semAula: !existente.semAula },
    })
    return serializarDataAula(atualizado)
  }

  const criado = await prisma.dataAula.create({
    data: { turmaId, professorId, data, periodo: dados.periodo, semAula: true },
  })
  return serializarDataAula(criado)
}

export async function definirPresenca(
  alunoId: string,
  dataAulaId: string,
  professorId: string,
  presente: boolean | null,
) {
  const aluno = await alunoDoProfessor(alunoId, professorId)
  const dataAula = await dataAulaDoProfessor(dataAulaId, professorId)
  if (aluno.turmaId !== dataAula.turmaId) {
    throw AppError.requisicaoInvalida('Esse aluno não é da turma dessa aula.')
  }

  return prisma.frequencia.upsert({
    where: { alunoId_dataAulaId: { alunoId, dataAulaId } },
    update: { presente },
    create: { alunoId, dataAulaId, presente },
  })
}
