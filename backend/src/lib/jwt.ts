import jwt from 'jsonwebtoken'

export interface TokenPayload {
  professorId: string
}

function obterSegredo(): string {
  const segredo = process.env.JWT_SECRET
  if (!segredo) {
    throw new Error('Defina JWT_SECRET no .env antes de iniciar o servidor.')
  }
  return segredo
}

const SEGREDO = obterSegredo()

export function gerarToken(payload: TokenPayload): string {
  return jwt.sign(payload, SEGREDO, { expiresIn: '30d' })
}

export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, SEGREDO) as TokenPayload
}
