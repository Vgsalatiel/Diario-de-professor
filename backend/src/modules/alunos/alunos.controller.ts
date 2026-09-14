import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as alunosService from './alunos.service'
import { atualizarAlunoDto, criarAlunoDto } from './alunos.dto'

export async function listarTodos(req: Request, res: Response) {
  const alunos = await alunosService.listarTodos(req.professorId)
  res.json(alunos)
}

export async function criar(req: Request, res: Response) {
  const dados = criarAlunoDto.parse(req.body)
  const aluno = await alunosService.criar(paramId(req.params.turmaId), req.professorId, dados)
  res.status(201).json(aluno)
}

export async function atualizar(req: Request, res: Response) {
  const dados = atualizarAlunoDto.parse(req.body)
  const aluno = await alunosService.atualizar(paramId(req.params.alunoId), req.professorId, dados)
  res.json(aluno)
}

export async function remover(req: Request, res: Response) {
  await alunosService.remover(paramId(req.params.alunoId), req.professorId)
  res.status(204).send()
}
