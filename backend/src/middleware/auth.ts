import type { NextFunction, Request, Response } from 'express'
import { verificarToken } from '../lib/jwt'
import { AppError } from '../utils/AppError'

// Depois desse middleware, toda rota autenticada pode ler req.professorId
declare global {
  namespace Express {
    interface Request {
      professorId: string
    }
  }
}

export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization
  const token = cabecalho?.startsWith('Bearer ') ? cabecalho.slice(7) : null

  if (!token) {
    next(AppError.naoAutorizado('Faça login para continuar.'))
    return
  }

  try {
    const payload = verificarToken(token)
    req.professorId = payload.professorId
    next()
  } catch {
    next(AppError.naoAutorizado('Sessão inválida ou expirada. Entre novamente.'))
  }
}
