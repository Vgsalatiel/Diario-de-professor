import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { AppError } from '../utils/AppError'

// Roda depois de "autenticar" — confere se quem está logado é diretor(a),
// não um professor comum. Vem depois pra já ter req.professorId disponível.
export async function exigirAdmin(req: Request, _res: Response, next: NextFunction) {
  const professor = await prisma.professor.findUnique({ where: { id: req.professorId } })
  if (!professor?.isAdmin) {
    next(AppError.proibido('Só contas de diretor(a) têm acesso a essa área.'))
    return
  }
  next()
}
