import type { Request, Response } from 'express'
import * as jobsService from './jobs.service'

export async function avisosDiarios(_req: Request, res: Response) {
  const resultado = await jobsService.enviarAvisosDoDia()
  res.json(resultado)
}
