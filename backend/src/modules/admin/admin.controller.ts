import type { Request, Response } from 'express'
import { paramId } from '../../utils/params'
import * as adminService from './admin.service'

export async function listarProfessores(_req: Request, res: Response) {
  const professores = await adminService.listarProfessores()
  res.json(professores)
}

export async function obterDashboard(_req: Request, res: Response) {
  const dashboard = await adminService.obterDashboard()
  res.json(dashboard)
}

export async function excluirProfessor(req: Request, res: Response) {
  await adminService.excluirProfessor(paramId(req.params.professorId), req.professorId)
  res.status(204).send()
}
