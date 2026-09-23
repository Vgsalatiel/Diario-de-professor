import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as coordenacaoService from './coordenacao.service'
import { criarObservacaoDto, criarReuniaoDto } from './coordenacao.dto'

export async function dashboard(_req: Request, res: Response) {
  res.json(await coordenacaoService.obterDashboard())
}

export async function listarProfessores(_req: Request, res: Response) {
  res.json(await coordenacaoService.listarProfessores())
}

export async function detalharProfessor(req: Request, res: Response) {
  res.json(await coordenacaoService.detalharProfessor(paramId(req.params.id)))
}

export async function listarTurmas(_req: Request, res: Response) {
  res.json(await coordenacaoService.listarTurmasDetalhado())
}

export async function detalharTurma(req: Request, res: Response) {
  res.json(await coordenacaoService.detalharTurma(paramId(req.params.id)))
}

export async function listarAlunos(_req: Request, res: Response) {
  res.json(await coordenacaoService.listarAlunosDetalhado())
}

export async function listarEventos(_req: Request, res: Response) {
  res.json(await coordenacaoService.listarEventosDaEscola())
}

export async function criarReuniao(req: Request, res: Response) {
  const dados = criarReuniaoDto.parse(req.body)
  res.status(201).json(await coordenacaoService.criarReuniao(req.professorId, dados))
}

export async function listarObservacoes(req: Request, res: Response) {
  const professorId = typeof req.query.professorId === 'string' ? req.query.professorId : undefined
  res.json(await coordenacaoService.listarObservacoes(professorId))
}

export async function criarObservacao(req: Request, res: Response) {
  const dados = criarObservacaoDto.parse(req.body)
  res.status(201).json(await coordenacaoService.criarObservacao(req.professorId, dados))
}

export async function removerObservacao(req: Request, res: Response) {
  await coordenacaoService.removerObservacao(paramId(req.params.id), req.professorId)
  res.status(204).send()
}

// Usado fora da área de coordenação: o próprio professor lendo as
// observações que recebeu sobre o próprio trabalho.
export async function minhasObservacoes(req: Request, res: Response) {
  res.json(await coordenacaoService.listarObservacoes(req.professorId))
}

// E marcando uma solicitação de correção como resolvida.
export async function resolverObservacao(req: Request, res: Response) {
  res.json(await coordenacaoService.resolverObservacao(paramId(req.params.id), req.professorId))
}
