import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as registrosAulaService from './registrosAula.service'
import { definirRegistroAulaDto } from './registrosAula.dto'

export async function listarTodos(req: Request, res: Response) {
  const registros = await registrosAulaService.listarTodos(req.professorId)
  res.json(registros)
}

export async function definir(req: Request, res: Response) {
  const dados = definirRegistroAulaDto.parse(req.body)
  const registro = await registrosAulaService.definir(
    paramId(req.params.turmaId),
    req.professorId,
    dados,
  )
  res.json(registro)
}
