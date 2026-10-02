import { describe, expect, it } from 'vitest'
import * as alunosService from '../modules/alunos/alunos.service'
import * as avaliacoesService from '../modules/avaliacoes/avaliacoes.service'
import * as notasService from '../modules/notas/notas.service'
import * as turmasService from '../modules/turmas/turmas.service'
import { criarAluno, criarAvaliacao, criarProfessor, criarTurma } from './fabrica'

describe('acesso entre professores', () => {
  it('um professor não vê nem mexe na turma de outro', async () => {
    const a = await criarProfessor()
    const b = await criarProfessor()
    const turmaA = await criarTurma(a.id)
    const alunoA = await criarAluno(turmaA.id)
    await criarAvaliacao(turmaA.id, a.id)

    expect(await turmasService.listar(b.id)).toHaveLength(0)
    expect(await alunosService.listarTodos(b.id)).toHaveLength(0)
    expect(await avaliacoesService.listarTodas(b.id)).toHaveLength(0)

    await expect(alunosService.atualizar(alunoA.id, b.id, { nome: 'Invasor' })).rejects.toMatchObject({ status: 404 })
    await expect(turmasService.remover(turmaA.id, b.id)).rejects.toMatchObject({ status: 404 })
  })

  it('turma excluída some das listagens e não aceita nota', async () => {
    const a = await criarProfessor()
    const turma = await criarTurma(a.id)
    const aluno = await criarAluno(turma.id)
    const av = await criarAvaliacao(turma.id, a.id)
    await turmasService.remover(turma.id, a.id)

    expect(await turmasService.listar(a.id)).toHaveLength(0)
    await expect(notasService.definir(aluno.id, av.id, a.id, { valor: 7 })).rejects.toMatchObject({ status: 404 })
  })
})

describe('regras de nota', () => {
  it('recusa nota de aluno de outra turma', async () => {
    const a = await criarProfessor()
    const t1 = await criarTurma(a.id)
    const t2 = await criarTurma(a.id)
    const alunoT1 = await criarAluno(t1.id)
    const avT2 = await criarAvaliacao(t2.id, a.id)

    await expect(notasService.definir(alunoT1.id, avT2.id, a.id, { valor: 8 })).rejects.toMatchObject({ status: 400 })
  })

  it('turma por nota não aceita conceito', async () => {
    const a = await criarProfessor()
    const turma = await criarTurma(a.id)
    const aluno = await criarAluno(turma.id)
    const av = await criarAvaliacao(turma.id, a.id)

    await expect(notasService.definir(aluno.id, av.id, a.id, { conceito: 'A' })).rejects.toMatchObject({ status: 400 })
    const nota = await notasService.definir(aluno.id, av.id, a.id, { valor: 7.5 })
    expect(nota.valor).toBe(7.5)
  })
})
