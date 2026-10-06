import webpush from 'web-push'

// Sem as chaves VAPID (ex.: rodando local sem configurar), não quebra o
// fluxo — o push só fica desligado e o aviso diário segue só por e-mail.
const chavePublica = process.env.VAPID_PUBLIC_KEY
const chavePrivada = process.env.VAPID_PRIVATE_KEY

// O web-push exige "mailto:..." ou uma URL — um e-mail puro (fácil de
// esquecer o prefixo no painel do Render) ganha o "mailto:" aqui.
export function normalizarContatoVapid(valor: string | undefined): string {
  const contato = valor?.trim() || 'mailto:contato@example.com'
  return /^[^\s@:]+@[^\s@]+$/.test(contato) ? `mailto:${contato}` : contato
}

function configurarVapid(): boolean {
  if (!chavePublica || !chavePrivada) return false
  // Configuração inválida desliga só o push — nunca derruba a API inteira.
  try {
    webpush.setVapidDetails(normalizarContatoVapid(process.env.VAPID_SUBJECT), chavePublica, chavePrivada)
    return true
  } catch (erro) {
    console.error('[push] Configuração VAPID inválida — notificações desligadas:', erro)
    return false
  }
}

export const pushConfigurado = configurarVapid()

export function chavePublicaPush(): string | null {
  return pushConfigurado ? chavePublica! : null
}

export type InscricaoDestino = { endpoint: string; p256dh: string; auth: string }

export type MensagemPush = {
  titulo: string
  corpo: string
  // Caminho do app aberto ao tocar na notificação (ex.: "/agenda")
  url: string
  // Notificação nova com a mesma tag substitui a anterior no aparelho em
  // vez de empilhar (ex.: a mesma reunião remarcada duas vezes)
  tag?: string
}

// Devolve "expirada" quando o serviço de push diz que esse aparelho não
// existe mais (desinstalou o app, revogou a permissão) — quem chamou apaga
// a inscrição. Qualquer outra falha só é logada, pra não derrubar o envio
// dos demais professores.
export async function enviarPush(
  inscricao: InscricaoDestino,
  mensagem: MensagemPush,
): Promise<'ok' | 'expirada' | 'falhou'> {
  if (!pushConfigurado) return 'falhou'

  try {
    await webpush.sendNotification(
      { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } },
      JSON.stringify(mensagem),
      // Se o celular estiver desligado, o serviço guarda a mensagem por até
      // 12h — depois disso o "resumo de hoje" já não serve mais.
      { TTL: 60 * 60 * 12 },
    )
    return 'ok'
  } catch (erro) {
    const status = (erro as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) return 'expirada'
    console.error('[push] Falha ao enviar notificação:', erro)
    return 'falhou'
  }
}
