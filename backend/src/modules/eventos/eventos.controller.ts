import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as eventosService from './eventos.service'
import { atualizarEventoDto, criarEventoDto } from './eventos.dto'

export async function listarTodos(req: Request, res: Response) {
  const eventos = await eventosService.listarTodos(req.professorId)
  res.json(eventos)
}

export async function criar(req: Request, res: Response) {
  const dados = criarEventoDto.parse(req.body)
  const evento = await eventosService.criar(req.professorId, dados)
  res.status(201).json(evento)
}

export async function atualizar(req: Request, res: Response) {
  const dados = atualizarEventoDto.parse(req.body)
  const evento = await eventosService.atualizar(
    paramId(req.params.eventoId),
    req.professorId,
    dados,
  )
  res.json(evento)
}

export async function remover(req: Request, res: Response) {
  await eventosService.remover(paramId(req.params.eventoId), req.professorId)
  res.status(204).send()
}
