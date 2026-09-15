import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as planosService from './planos.service'
import { atualizarPlanoDto, criarPlanoDto } from './planos.dto'

export async function listarTodos(req: Request, res: Response) {
  const planos = await planosService.listarTodos(req.professorId)
  res.json(planos)
}

export async function criar(req: Request, res: Response) {
  const dados = criarPlanoDto.parse(req.body)
  const plano = await planosService.criar(paramId(req.params.turmaId), req.professorId, dados)
  res.status(201).json(plano)
}

export async function atualizar(req: Request, res: Response) {
  const dados = atualizarPlanoDto.parse(req.body)
  const plano = await planosService.atualizar(
    paramId(req.params.planoId),
    req.professorId,
    dados,
  )
  res.json(plano)
}

export async function remover(req: Request, res: Response) {
  await planosService.remover(paramId(req.params.planoId), req.professorId)
  res.status(204).send()
}
