import type { NextFunction, Request, Response } from 'express'
import { impressaoSenha, verificarToken, type TokenPayload } from '../lib/jwt'
import { prisma } from '../lib/prisma'
import { AppError } from '../utils/AppError'

// Depois desse middleware, toda rota autenticada pode ler req.professorId
declare global {
  namespace Express {
    interface Request {
      professorId: string
    }
  }
}

export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization
  const token = cabecalho?.startsWith('Bearer ') ? cabecalho.slice(7) : null

  if (!token) {
    next(AppError.naoAutorizado('Faça login para continuar.'))
    return
  }

  let payload: TokenPayload
  try {
    payload = verificarToken(token)
  } catch {
    next(AppError.naoAutorizado('Sessão inválida ou expirada. Entre novamente.'))
    return
  }

  // A conta ainda existe e a senha não mudou desde que esse token foi
  // emitido? Trocar a senha (ou redefinir pelo e-mail) derruba as sessões
  // antigas — inclusive a de quem tenha pego um token emprestado.
  const professor = await prisma.professor.findUnique({
    where: { id: payload.professorId },
    select: { senha: true },
  })
  if (!professor || payload.sv !== impressaoSenha(professor.senha)) {
    next(AppError.naoAutorizado('Sessão encerrada. Entre novamente.'))
    return
  }

  req.professorId = payload.professorId
  next()
}
