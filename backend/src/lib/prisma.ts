import { PrismaClient } from '@prisma/client'

// Uma única instância do client em todo o processo — evita abrir uma
// conexão nova a cada import (comum em dev com hot-reload).
export const prisma = new PrismaClient()
