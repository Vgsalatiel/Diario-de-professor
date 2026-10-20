import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { app } from '../app'
import { criarProfessor } from './fabrica'

// Sobe a API numa porta livre e faz login de verdade, pela rota HTTP —
// é onde o limite de tentativas mora.
let servidor: Server
let base = ''

beforeAll(async () => {
  servidor = app.listen(0)
  await new Promise((r) => servidor.once('listening', r))
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`
})

afterAll(() => new Promise<void>((r) => servidor.close(() => r())))

async function entrar(email: string, senha: string): Promise<number> {
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  })
  return r.status
}

describe('limite de tentativas de login', () => {
  it('vários professores da mesma rede entram sem ser bloqueados', async () => {
    const profs = await Promise.all(Array.from({ length: 8 }, () => criarProfessor('senha123')))
    for (const p of profs) expect(await entrar(p.email, 'senha123')).toBe(200)
  })

  it('senha errada demais trava só aquela conta', async () => {
    const alvo = await criarProfessor('senha123')
    const colega = await criarProfessor('senha123')
    for (let i = 0; i < 5; i++) expect(await entrar(alvo.email, 'errada')).toBe(401)
    // a sexta tentativa, mesmo com a senha certa, espera a janela passar
    expect(await entrar(alvo.email, 'senha123')).toBe(429)
    // e o colega na mesma rede continua entrando
    expect(await entrar(colega.email, 'senha123')).toBe(200)
  })
})
