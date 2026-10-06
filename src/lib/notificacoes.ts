// Notificações no celular/PC (Web Push). O navegador gera uma "inscrição"
// única do aparelho, o backend guarda e usa ela no aviso diário da agenda.
// Só funciona com o service worker do PWA registrado — ou seja, no site
// publicado (npm run build), não no `npm run dev`.
import { api } from './api'

export type EstadoNotificacoes =
  | 'carregando'
  | 'sem-suporte' // navegador não tem Push API
  | 'precisa-instalar' // iPhone/iPad fora do app instalado
  | 'bloqueado' // usuário negou a permissão
  | 'ativo'
  | 'inativo'

function suportaPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function ehIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad recente se identifica como Mac, mas tem tela de toque
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

function rodandoComoApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
}

// Sem registro (ex.: npm run dev), serviceWorker.ready nunca resolve —
// por isso busca o registro direto e trata a ausência como "sem suporte".
async function registroDoApp(): Promise<ServiceWorkerRegistration | null> {
  if (!suportaPush()) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

export async function obterEstadoNotificacoes(): Promise<EstadoNotificacoes> {
  // No iPhone a Push API só existe dentro do app instalado na tela inicial
  if (ehIOS() && !rodandoComoApp()) return 'precisa-instalar'
  const registro = await registroDoApp()
  if (!registro) return 'sem-suporte'
  if (Notification.permission === 'denied') return 'bloqueado'
  const inscricao = await registro.pushManager.getSubscription()
  return inscricao && Notification.permission === 'granted' ? 'ativo' : 'inativo'
}

// A chave VAPID vem em base64url; o navegador quer os bytes crus
function chaveParaBytes(base64url: string): Uint8Array {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

export async function ativarNotificacoes(): Promise<EstadoNotificacoes> {
  const registro = await registroDoApp()
  if (!registro) return 'sem-suporte'

  const permissao = await Notification.requestPermission()
  if (permissao === 'denied') return 'bloqueado'
  if (permissao !== 'granted') return 'inativo'

  const { chave } = await api.get<{ chave: string }>('/notificacoes/chave-publica')
  const inscricao =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: chaveParaBytes(chave) as BufferSource,
    }))

  await api.post('/notificacoes/inscricoes', inscricao.toJSON())
  return 'ativo'
}

export async function desativarNotificacoes(): Promise<EstadoNotificacoes> {
  const registro = await registroDoApp()
  const inscricao = await registro?.pushManager.getSubscription()
  if (inscricao) {
    await api.post('/notificacoes/inscricoes/remover', { endpoint: inscricao.endpoint })
    await inscricao.unsubscribe()
  }
  return 'inativo'
}

// Ao sair da conta: cancela a inscrição só no navegador (o token já não vale
// pra avisar o backend). No próximo envio o serviço de push responde que
// ela expirou e o backend apaga — assim quem entrar depois nesse aparelho
// não recebe a agenda de outra pessoa.
export async function cancelarNotificacoesNesteAparelho(): Promise<void> {
  try {
    const registro = await registroDoApp()
    await (await registro?.pushManager.getSubscription())?.unsubscribe()
  } catch {
    // sem suporte ou falha local — nada a fazer
  }
}
