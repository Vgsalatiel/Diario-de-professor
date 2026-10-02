import { afterAll, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma'
import { exigirBancoDeTeste } from './bancoTeste'

exigirBancoDeTeste(process.env.DATABASE_URL)

// Começa cada teste com o banco vazio. Antes de apagar, confere pelo
// próprio servidor que a conexão é mesmo o banco de teste.
beforeEach(async () => {
  const [{ banco }] = await prisma.$queryRaw<{ banco: string }[]>`select current_database() as banco`
  if (!banco.includes('teste')) throw new Error(`Recusado: conectado em "${banco}", não no banco de teste.`)
  const tabelas = await prisma.$queryRaw<{ tablename: string }[]>`
    select tablename from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'`
  if (tabelas.length > 0) {
    await prisma.$executeRawUnsafe(
      `truncate table ${tabelas.map((t) => `"${t.tablename}"`).join(', ')} restart identity cascade`,
    )
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})
