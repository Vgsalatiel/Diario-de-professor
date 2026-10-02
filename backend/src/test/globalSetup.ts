import { execSync } from 'node:child_process'
import { exigirBancoDeTeste } from './bancoTeste'

// Aplica as migrations no banco de teste antes de tudo.
export default function () {
  exigirBancoDeTeste(process.env.DATABASE_URL)
  exigirBancoDeTeste(process.env.DIRECT_URL)
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env })
}
