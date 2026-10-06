import { prisma } from '../../lib/prisma'
import { chavePublicaPush } from '../../lib/push'
import { AppError } from '../../utils/AppError'
import type { InscreverDto } from './notificacoes.dto'

export function obterChavePublica() {
  const chave = chavePublicaPush()
  if (!chave) throw new AppError(503, 'Notificações não estão configuradas no servidor.')
  return { chave }
}

// O endpoint é único por navegador — se outro professor já tinha entrado
// nesse aparelho, a inscrição passa a ser de quem ativou por último.
export async function inscrever(professorId: string, dados: InscreverDto) {
  await prisma.inscricaoPush.upsert({
    where: { endpoint: dados.endpoint },
    create: {
      endpoint: dados.endpoint,
      p256dh: dados.keys.p256dh,
      auth: dados.keys.auth,
      professorId,
    },
    update: { p256dh: dados.keys.p256dh, auth: dados.keys.auth, professorId },
  })
}

export async function removerInscricao(professorId: string, endpoint: string) {
  await prisma.inscricaoPush.deleteMany({ where: { endpoint, professorId } })
}
