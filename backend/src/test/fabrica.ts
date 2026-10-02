import { prisma } from '../lib/prisma'
import { hashSenha } from '../lib/hash'

// Atalhos pra montar os dados de cada teste direto no banco de teste.
let seq = 0

export async function criarProfessor(senha = 'senha123') {
  seq++
  return prisma.professor.create({
    data: { nome: `Professor ${seq}`, email: `prof${seq}@teste.local`, senha: await hashSenha(senha), materias: [] },
  })
}

export async function criarTurma(professorId: string, extra: Record<string, unknown> = {}) {
  seq++
  return prisma.turma.create({
    data: {
      nome: `Turma ${seq}`,
      serie: '',
      escola: 'Escola Teste',
      anoLetivo: '2026',
      sistemaPeriodo: 'bimestre',
      cor: '#4759a8',
      diasAula: [1, 2, 3, 4, 5],
      professores: { create: { professorId, disciplina: 'Matemática' } },
      configs: { create: { professorId, modelo: 'simples', mediaAprovacao: 6, tipoAvaliacao: 'nota' } },
      ...extra,
    },
  })
}

export function criarAluno(turmaId: string, nome = 'Aluno Teste') {
  return prisma.aluno.create({ data: { nome, turmaId } })
}

export function criarAvaliacao(turmaId: string, professorId: string) {
  return prisma.avaliacao.create({ data: { nome: 'Prova 1', peso: 1, periodo: '1', turmaId, professorId } })
}
