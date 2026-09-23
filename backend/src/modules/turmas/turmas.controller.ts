import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as turmasService from './turmas.service'
import { atualizarConfigDto } from './turmas.dto'

// Somente leitura pro professor comum — criar/editar/excluir turma e
// atribuir professores é feito pela coordenação (ver módulo coordenacao).
export async function listar(req: Request, res: Response) {
  const turmas = await turmasService.listar(req.professorId)
  res.json(turmas)
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
