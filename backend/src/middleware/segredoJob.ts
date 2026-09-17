import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/AppError'

// Protege rotas chamadas só por automação (ex.: o cron do GitHub Actions),
// nunca pelo navegador do professor — por isso usa uma senha compartilhada
// fixa em vez de JWT de usuário.
export function verificarSegredoJob(req: Request, _res: Response, next: NextFunction) {
  const segredo = process.env.JOBS_SECRET
  const recebido = req.headers['x-job-secret']

  if (!segredo) {
    next(AppError.requisicaoInvalida('JOBS_SECRET não configurado no servidor.'))
    return
  }
  if (recebido !== segredo) {
    next(AppError.naoAutorizado('Segredo inválido.'))
    return
  }
  next()
}
