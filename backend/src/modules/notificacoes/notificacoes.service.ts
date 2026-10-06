import { prisma } from '../../lib/prisma'
import { chavePublicaPush, enviarPush, pushConfigurado, type InscricaoDestino, type MensagemPush } from '../../lib/push'
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

// Manda a mesma mensagem pra todos os aparelhos e apaga as inscrições que
// o serviço de push deu como expiradas (app desinstalado, permissão revogada).
export async function enviarParaInscricoes(
  inscricoes: (InscricaoDestino & { id: string })[],
  mensagem: MensagemPush,
) {
  let enviadas = 0
  const expiradas: string[] = []
  for (const inscricao of inscricoes) {
    const resultado = await enviarPush(inscricao, mensagem)
    if (resultado === 'ok') enviadas++
    if (resultado === 'expirada') expiradas.push(inscricao.id)
  }
  if (expiradas.length > 0) {
    await prisma.inscricaoPush.deleteMany({ where: { id: { in: expiradas } } })
  }
  return { enviadas, expiradas: expiradas.length }
}

export async function avisarProfessor(professorId: string, mensagem: MensagemPush) {
  if (!pushConfigurado) return
  const inscricoes = await prisma.inscricaoPush.findMany({ where: { professorId } })
  await enviarParaInscricoes(inscricoes, mensagem)
}
