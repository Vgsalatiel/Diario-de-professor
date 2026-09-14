import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as avaliacoesService from './avaliacoes.service'
import { atualizarAvaliacaoDto, criarAvaliacaoDto } from './avaliacoes.dto'

export async function listarTodas(req: Request, res: Response) {
  const avaliacoes = await avaliacoesService.listarTodas(req.professorId)
  res.json(avaliacoes)
}

export async function criar(req: Request, res: Response) {
  const dados = criarAvaliacaoDto.parse(req.body)
  const avaliacao = await avaliacoesService.criar(
    paramId(req.params.turmaId),
    req.professorId,
    dados,
  )
  res.status(201).json(avaliacao)
}

export async function atualizar(req: Request, res: Response) {
  const dados = atualizarAvaliacaoDto.parse(req.body)
  const avaliacao = await avaliacoesService.atualizar(
    paramId(req.params.avaliacaoId),
    req.professorId,
    dados,
  )
  res.json(avaliacao)
}

export async function remover(req: Request, res: Response) {
  await avaliacoesService.remover(paramId(req.params.avaliacaoId), req.professorId)
  res.status(204).send()
}
