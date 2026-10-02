import { describe, expect, it } from 'vitest'
import * as turmasService from '../modules/turmas/turmas.service'
import * as eventosService from '../modules/eventos/eventos.service'
import { prisma } from '../lib/prisma'
import { criarAluno, criarProfessor, criarTurma } from './fabrica'

describe('promover turma', () => {
  it('copia turno e etapa, avança o ano BNCC e leva só alunos ativos', async () => {
    const prof = await criarProfessor()
    const turma = await criarTurma(prof.id, { turno: 'manha', etapaBncc: 'fundamental', anoSerieBncc: 8 })
    await criarAluno(turma.id, 'Ativo')
    const saiu = await criarAluno(turma.id, 'Transferido')
    await prisma.aluno.update({ where: { id: saiu.id }, data: { situacao: 'transferido' } })

    const { turma: nova, alunos } = await turmasService.promover(turma.id, prof.id, { nome: '9º A', serie: '', anoLetivo: '2027' })
    expect(nova).toMatchObject({ turno: 'manha', etapaBncc: 'fundamental', anoSerieBncc: 9, anoLetivo: '2027' })
    expect(alunos.map((a) => a.nome)).toEqual(['Ativo'])
  })

  it('não cria duas vezes a mesma turma (clique duplo)', async () => {
    const prof = await criarProfessor()
    const turma = await criarTurma(prof.id)
    const dados = { nome: '9º A', serie: '', anoLetivo: '2027' }
    await turmasService.promover(turma.id, prof.id, dados)
    await expect(turmasService.promover(turma.id, prof.id, dados)).rejects.toMatchObject({ status: 409 })
  })
})

describe('evento', () => {
  it('trocar a turma apaga as entregas dos alunos da turma antiga', async () => {
    const prof = await criarProfessor()
    const t1 = await criarTurma(prof.id)
    const t2 = await criarTurma(prof.id)
    const aluno = await criarAluno(t1.id)
    const evento = await eventosService.criar(prof.id, { titulo: 'Trabalho', tipo: 'trabalho', data: '2026-10-10', turmaId: t1.id })
    await prisma.entrega.create({ data: { alunoId: aluno.id, eventoId: evento.id, status: 'feito' } })

    await eventosService.atualizar(evento.id, prof.id, { turmaId: t2.id })
    expect(await prisma.entrega.count({ where: { eventoId: evento.id } })).toBe(0)
  })

  it('dá pra limpar o horário', async () => {
    const prof = await criarProfessor()
    const evento = await eventosService.criar(prof.id, { titulo: 'Reunião', tipo: 'reuniao', data: '2026-10-10', hora: '10:00' })
    const atualizado = await eventosService.atualizar(evento.id, prof.id, { hora: null })
    expect(atualizado.hora).toBeNull()
  })
})
