import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as coordenacaoService from './coordenacao.service'
import {
  atribuirProfessorDto,
  atualizarReuniaoDto,
  criarAcompanhamentoDto,
  criarEncaminhamentoDto,
  criarObservacaoDto,
  criarReuniaoDto,
} from './coordenacao.dto'
import { atualizarTurmaDto, criarTurmaDto, promoverTurmaDto } from '../turmas/turmas.dto'

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
  res.json(await coordenacaoService.listarTurmas())
}

export async function detalharTurma(req: Request, res: Response) {
  res.json(await coordenacaoService.detalharTurma(paramId(req.params.id)))
}

export async function criarTurma(req: Request, res: Response) {
  const dados = criarTurmaDto.parse(req.body)
  const turma = await coordenacaoService.criarTurma(dados)
  res.status(201).json(turma)
}

export async function atualizarTurma(req: Request, res: Response) {
  const dados = atualizarTurmaDto.parse(req.body)
  const turma = await coordenacaoService.atualizarTurma(paramId(req.params.id), dados)
  res.json(turma)
}

export async function removerTurma(req: Request, res: Response) {
  await coordenacaoService.removerTurma(paramId(req.params.id))
  res.status(204).send()
}

export async function promoverTurma(req: Request, res: Response) {
  const dados = promoverTurmaDto.parse(req.body)
  const resultado = await coordenacaoService.promoverTurma(paramId(req.params.id), dados)
  res.status(201).json(resultado)
}

export async function atribuirProfessor(req: Request, res: Response) {
  const dados = atribuirProfessorDto.parse(req.body)
  const atribuicao = await coordenacaoService.atribuirProfessor(paramId(req.params.id), dados)
  res.status(201).json(atribuicao)
}

export async function removerProfessor(req: Request, res: Response) {
  await coordenacaoService.removerProfessor(paramId(req.params.id), paramId(req.params.professorId))
  res.status(204).send()
}

export async function listarAlunos(_req: Request, res: Response) {
  res.json(await coordenacaoService.listarAlunosDetalhado())
}

export async function listarEventos(_req: Request, res: Response) {
  res.json(await coordenacaoService.listarEventosDaEscola())
}

export async function detalharAluno(req: Request, res: Response) {
  res.json(await coordenacaoService.detalharAluno(paramId(req.params.id)))
}

export async function criarAcompanhamento(req: Request, res: Response) {
  const dados = criarAcompanhamentoDto.parse(req.body)
  res
    .status(201)
    .json(await coordenacaoService.criarAcompanhamento(paramId(req.params.id), req.professorId, dados))
}

export async function criarReuniao(req: Request, res: Response) {
  const dados = criarReuniaoDto.parse(req.body)
  res.status(201).json(await coordenacaoService.criarReuniao(req.professorId, dados))
}

export async function detalharReuniao(req: Request, res: Response) {
  res.json(await coordenacaoService.detalharReuniao(paramId(req.params.id)))
}

export async function atualizarReuniao(req: Request, res: Response) {
  const dados = atualizarReuniaoDto.parse(req.body)
  res.json(await coordenacaoService.atualizarReuniao(paramId(req.params.id), dados))
}

export async function criarEncaminhamento(req: Request, res: Response) {
  const dados = criarEncaminhamentoDto.parse(req.body)
  res.status(201).json(await coordenacaoService.criarEncaminhamento(paramId(req.params.id), dados))
}

export async function alternarEncaminhamento(req: Request, res: Response) {
  res.json(await coordenacaoService.alternarEncaminhamento(paramId(req.params.id)))
}

export async function removerEncaminhamento(req: Request, res: Response) {
  res.json(await coordenacaoService.removerEncaminhamento(paramId(req.params.id)))
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
