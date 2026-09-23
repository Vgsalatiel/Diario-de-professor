import type { Aluno, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { alunoDoProfessor, turmaAtribuidaAoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import { gerarExerciciosPersonalizados } from '../../lib/gemini'
import type { AtualizarAlunoDto, CriarAlunoDto, GerarExerciciosDto } from './alunos.dto'

function serializar(aluno: Aluno) {
  return { ...aluno, dataNascimento: paraDataISO(aluno.dataNascimento) }
}

// Todos os alunos de todas as turmas do professor — a tela de Alunos do
// frontend carrega tudo de uma vez e filtra por escola/turma no cliente.
export async function listarTodos(professorId: string) {
  const alunos = await prisma.aluno.findMany({
    where: {
      excluidoEm: null,
      turma: { professores: { some: { professorId } }, excluidoEm: null },
    },
    orderBy: { nome: 'asc' },
  })
  return alunos.map(serializar)
}

export async function criar(turmaId: string, professorId: string, dados: CriarAlunoDto) {
  await turmaAtribuidaAoProfessor(turmaId, professorId)
  const aluno = await prisma.aluno.create({
    data: {
      ...dados,
      dataNascimento: dados.dataNascimento ? new Date(dados.dataNascimento) : undefined,
      turmaId,
    },
  })
  return serializar(aluno)
}

export async function atualizar(alunoId: string, professorId: string, dados: AtualizarAlunoDto) {
  await alunoDoProfessor(alunoId, professorId)
  const aluno = await prisma.aluno.update({
    where: { id: alunoId },
    data: {
      ...dados,
      dataNascimento: dados.dataNascimento ? new Date(dados.dataNascimento) : undefined,
    },
  })
  return serializar(aluno)
}

export async function gerarExercicios(
  alunoId: string,
  professorId: string,
  dados: GerarExerciciosDto,
) {
  const aluno = await alunoDoProfessor(alunoId, professorId)
  const resultado = await gerarExerciciosPersonalizados({
    nomeAluno: aluno.nome,
    assunto: dados.assunto,
    dificuldade: dados.dificuldade,
    quantidade: dados.quantidade,
  })

  const salvo = await prisma.exercicioGerado.create({
    data: {
      alunoId,
      titulo: resultado.titulo,
      assunto: dados.assunto,
      dificuldade: dados.dificuldade,
      nomeProva: dados.nomeProva,
      dataProva: dados.dataProva ? new Date(dados.dataProva) : undefined,
      questoes: resultado.questoes as unknown as Prisma.InputJsonValue,
    },
  })

  return {
    ...resultado,
    id: salvo.id,
    criadoEm: salvo.criadoEm.toISOString(),
    nomeProva: salvo.nomeProva,
    dataProva: paraDataISO(salvo.dataProva),
  }
}

export async function listarExerciciosGerados(alunoId: string, professorId: string) {
  await alunoDoProfessor(alunoId, professorId)
  const lista = await prisma.exercicioGerado.findMany({
    where: { alunoId },
    orderBy: { criadoEm: 'desc' },
  })
  return lista.map((e) => ({
    ...e,
    criadoEm: e.criadoEm.toISOString(),
    dataProva: paraDataISO(e.dataProva),
  }))
}

export async function remover(alunoId: string, professorId: string) {
  await alunoDoProfessor(alunoId, professorId)
  // Soft delete — notas e frequência desse aluno continuam no banco, só
  // somem das telas.
  await prisma.aluno.update({ where: { id: alunoId }, data: { excluidoEm: new Date() } })
}
