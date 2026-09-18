import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as feriadosService from './feriados.service'
import { criarFeriadoDto } from './feriados.dto'

export async function listarFeriados(req: Request, res: Response) {
  const feriados = await feriadosService.listarFeriados(req.professorId)
  res.json(feriados)
}

export async function criarFeriado(req: Request, res: Response) {
  const dados = criarFeriadoDto.parse(req.body)
  const feriado = await feriadosService.criarFeriado(req.professorId, dados)
  res.status(201).json(feriado)
}

export async function removerFeriado(req: Request, res: Response) {
  await feriadosService.removerFeriado(paramId(req.params.feriadoId), req.professorId)
  res.status(204).send()
}
