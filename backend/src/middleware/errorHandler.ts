import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { AppError } from '../utils/AppError'

// Middleware de erro do Express (4 parâmetros é o que faz o Express
// reconhecer como error handler, mesmo sem usar `next` no corpo).
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.status).json({ erro: err.message })
    return
  }

  if (err instanceof ZodError) {
    const primeiro = err.issues[0]
    const mensagem = primeiro
      ? `${primeiro.path.join('.')}: ${primeiro.message}`
      : 'Dados inválidos.'
    res.status(400).json({ erro: mensagem })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ erro: 'Já existe um registro com esse valor único.' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ erro: 'Registro não encontrado.' })
      return
    }
    if (err.code === 'P2003') {
      res.status(400).json({ erro: 'Referência inválida: o registro ligado a esse dado não existe.' })
      return
    }
  }

  // Erros do express.json(): corpo que não é JSON válido ou grande demais.
  const tipo = (err as { type?: string } | null)?.type
  if (tipo === 'entity.parse.failed') {
    res.status(400).json({ erro: 'Dados enviados em formato inválido.' })
    return
  }
  if (tipo === 'entity.too.large') {
    res.status(413).json({ erro: 'Os dados enviados são grandes demais.' })
    return
  }

  console.error(err)
  res.status(500).json({ erro: 'Erro interno do servidor.' })
}

export function rotaNaoEncontrada(_req: Request, res: Response) {
  res.status(404).json({ erro: 'Rota não encontrada.' })
}
