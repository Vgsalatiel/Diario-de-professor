import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as entregasService from './entregas.service'
import { definirEntregaDto } from './entregas.dto'

export async function listarEntregas(req: Request, res: Response) {
  const entregas = await entregasService.listarEntregas(req.professorId)
  res.json(entregas)
}

export async function definirEntrega(req: Request, res: Response) {
  const { status } = definirEntregaDto.parse(req.body)
  const entrega = await entregasService.definirEntrega(
    paramId(req.params.alunoId),
    paramId(req.params.eventoId),
    req.professorId,
    status,
  )
  res.json(entrega)
}
