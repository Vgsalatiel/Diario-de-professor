import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as notasService from './notas.service'
import { definirNotaDto } from './notas.dto'

export async function listarTodas(req: Request, res: Response) {
  const notas = await notasService.listarTodas(req.professorId)
  res.json(notas)
}

export async function definir(req: Request, res: Response) {
  const { valor } = definirNotaDto.parse(req.body)
  const nota = await notasService.definir(
    paramId(req.params.alunoId),
    paramId(req.params.avaliacaoId),
    req.professorId,
    valor,
  )
  res.json(nota)
}
