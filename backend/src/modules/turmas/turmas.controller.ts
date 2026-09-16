import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as turmasService from './turmas.service'
import {
  atualizarConfigDto,
  atualizarTurmaDto,
  criarTurmaDto,
  promoverTurmaDto,
} from './turmas.dto'

export async function listar(req: Request, res: Response) {
  const turmas = await turmasService.listar(req.professorId)
  res.json(turmas)
}

export async function criar(req: Request, res: Response) {
  const dados = criarTurmaDto.parse(req.body)
  const turma = await turmasService.criar(req.professorId, dados)
  res.status(201).json(turma)
}

export async function atualizar(req: Request, res: Response) {
  const dados = atualizarTurmaDto.parse(req.body)
  const turma = await turmasService.atualizar(paramId(req.params.turmaId), req.professorId, dados)
  res.json(turma)
}

export async function remover(req: Request, res: Response) {
  await turmasService.remover(paramId(req.params.turmaId), req.professorId)
  res.status(204).send()
}

export async function promover(req: Request, res: Response) {
  const dados = promoverTurmaDto.parse(req.body)
  const resultado = await turmasService.promover(
    paramId(req.params.turmaId),
    req.professorId,
    dados,
  )
  res.status(201).json(resultado)
}

export async function buscarConfig(req: Request, res: Response) {
  const config = await turmasService.buscarConfig(paramId(req.params.turmaId), req.professorId)
  res.json(config)
}

export async function atualizarConfig(req: Request, res: Response) {
  const dados = atualizarConfigDto.parse(req.body)
  const config = await turmasService.atualizarConfig(
    paramId(req.params.turmaId),
    req.professorId,
    dados,
  )
  res.json(config)
}
