import type { Request, Response } from 'express'
import * as notificacoesService from './notificacoes.service'
import { inscreverDto, removerInscricaoDto } from './notificacoes.dto'

export async function chavePublica(_req: Request, res: Response) {
  res.json(notificacoesService.obterChavePublica())
}

export async function inscrever(req: Request, res: Response) {
  const dados = inscreverDto.parse(req.body)
  await notificacoesService.inscrever(req.professorId, dados)
  res.status(204).send()
}

export async function removerInscricao(req: Request, res: Response) {
  const { endpoint } = removerInscricaoDto.parse(req.body)
  await notificacoesService.removerInscricao(req.professorId, endpoint)
  res.status(204).send()
}
