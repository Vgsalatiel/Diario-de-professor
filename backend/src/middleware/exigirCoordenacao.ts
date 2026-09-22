import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { AppError } from '../utils/AppError'

// Roda depois de "autenticar". Diretor(a) também passa — quem administra a
// escola inteira enxerga o que a coordenação vê, mas o contrário não vale.
export async function exigirCoordenacao(req: Request, _res: Response, next: NextFunction) {
  const professor = await prisma.professor.findUnique({ where: { id: req.professorId } })
  if (!professor?.isCoordenador && !professor?.isAdmin) {
    next(AppError.proibido('Só contas de coordenação pedagógica ou diretor(a) têm acesso a essa área.'))
    return
  }
  next()
}
