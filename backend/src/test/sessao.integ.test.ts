import { describe, expect, it } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { autenticar } from '../middleware/auth'
import * as authService from '../modules/auth/auth.service'
import { prisma } from '../lib/prisma'
import { criarProfessor } from './fabrica'

// Roda o middleware e devolve o erro passado ao next (ou null se liberou).
async function passarPor(token: string): Promise<{ status?: number } | null> {
  let resultado: { status?: number } | null = null
  const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request
  await autenticar(req, {} as Response, ((erro?: unknown) => {
    resultado = (erro as { status?: number }) ?? null
  }) as NextFunction)
  return resultado
}

describe('sessão', () => {
  it('token do login vale até a senha mudar', async () => {
    const prof = await criarProfessor('senha123')
    const { token } = await authService.login({ email: prof.email, senha: 'senha123' })
    expect(await passarPor(token)).toBeNull()

    const atualizado = await authService.atualizarPerfil(prof.id, { senha: 'novaSenha1', senhaAtual: 'senha123' })
    expect(await passarPor(token)).toMatchObject({ status: 401 })
    // quem trocou recebe um token novo, que vale
    expect(await passarPor((atualizado as { token: string }).token)).toBeNull()
  })

  it('trocar e-mail exige a senha atual correta', async () => {
    const prof = await criarProfessor('senha123')
    await expect(authService.atualizarPerfil(prof.id, { email: 'novo@teste.local' })).rejects.toMatchObject({ status: 400 })
    await expect(
      authService.atualizarPerfil(prof.id, { email: 'novo@teste.local', senhaAtual: 'errada' }),
    ).rejects.toMatchObject({ status: 400 })
    await authService.atualizarPerfil(prof.id, { email: 'novo@teste.local', senhaAtual: 'senha123' })
    expect((await prisma.professor.findUniqueOrThrow({ where: { id: prof.id } })).email).toBe('novo@teste.local')
  })

  it('conta apagada perde a sessão na hora', async () => {
    const prof = await criarProfessor('senha123')
    const { token } = await authService.login({ email: prof.email, senha: 'senha123' })
    await prisma.professor.delete({ where: { id: prof.id } })
    expect(await passarPor(token)).toMatchObject({ status: 401 })
  })
})
