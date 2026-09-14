import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as frequenciaService from './frequencia.service'
import { definirPresencaDto, garantirDataAulaDto } from './frequencia.dto'

export async function listarDatasAula(req: Request, res: Response) {
  const datas = await frequenciaService.listarDatasAula(req.professorId)
  res.json(datas)
}

export async function listarFrequencia(req: Request, res: Response) {
  const frequencia = await frequenciaService.listarFrequencia(req.professorId)
  res.json(frequencia)
}

export async function garantirDataAula(req: Request, res: Response) {
  const dados = garantirDataAulaDto.parse(req.body)
  const dataAula = await frequenciaService.garantirDataAula(
    paramId(req.params.turmaId),
    req.professorId,
    dados,
  )
  res.status(201).json(dataAula)
}

export async function alternarSemAula(req: Request, res: Response) {
  const dados = garantirDataAulaDto.parse(req.body)
  const dataAula = await frequenciaService.alternarSemAula(
    paramId(req.params.turmaId),
    req.professorId,
    dados,
  )
  res.json(dataAula)
}

export async function definirPresenca(req: Request, res: Response) {
  const { presente } = definirPresencaDto.parse(req.body)
  const frequencia = await frequenciaService.definirPresenca(
    paramId(req.params.alunoId),
    paramId(req.params.dataAulaId),
    req.professorId,
    presente,
  )
  res.json(frequencia)
}
