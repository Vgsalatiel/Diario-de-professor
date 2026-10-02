import { createHash } from 'node:crypto'
import jwt from 'jsonwebtoken'

export interface TokenPayload {
  professorId: string
  // "Impressão" da senha no momento do login (ver impressaoSenha) — se a
  // senha mudar, todo token emitido antes deixa de valer.
  sv?: string
}

// Trecho de um hash do hash da senha: muda sempre que a senha muda, sem
// expor nada útil sobre ela dentro do token.
export function impressaoSenha(senhaHash: string): string {
  return createHash('sha256').update(senhaHash).digest('hex').slice(0, 16)
}

export function gerarTokenDoProfessor(professor: { id: string; senha: string }): string {
  return gerarToken({ professorId: professor.id, sv: impressaoSenha(professor.senha) })
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
