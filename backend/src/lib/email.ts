import { Resend } from 'resend'

// Sem RESEND_API_KEY (ex.: rodando local sem configurar), não quebra o
// fluxo — só avisa no console e loga o link teria sido enviado.
const chave = process.env.RESEND_API_KEY
const resend = chave ? new Resend(chave) : null

const REMETENTE = process.env.EMAIL_FROM ?? 'Diário <onboarding@resend.dev>'

async function enviar(destino: string, assunto: string, html: string, contexto: string) {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY não configurada — ${contexto} para ${destino}: ${html}`)
    return
  }

  // O SDK do Resend não lança exceção em erro da API — devolve
  // { data, error } — então precisa checar esse campo manualmente,
  // senão um envio que falhou passa por "sucesso" silenciosamente.
  const { error } = await resend.emails.send({ from: REMETENTE, to: destino, subject: assunto, html })

  if (error) {
    console.error(`[email] Falha ao enviar ${contexto} para ${destino}:`, error)
  }
}

export async function enviarEmailRedefinicaoSenha(destino: string, link: string) {
  await enviar(
    destino,
    'Redefinir sua senha — Diário',
    `
      <p>Você pediu para redefinir sua senha no Diário.</p>
      <p><a href="${link}">Clique aqui para criar uma nova senha</a></p>
      <p>Esse link vale por 1 hora. Se você não pediu isso, pode ignorar este e-mail.</p>
    `,
    'link de redefinição de senha',
  )
}

export async function enviarEmailVerificacao(destino: string, link: string) {
  await enviar(
    destino,
    'Confirme seu e-mail — Diário',
    `
      <p>Falta pouco! Confirme seu e-mail pra ativar sua conta no Diário.</p>
      <p><a href="${link}">Clique aqui para confirmar seu e-mail</a></p>
      <p>Esse link vale por 24 horas. Se você não criou essa conta, pode ignorar este e-mail.</p>
    `,
    'link de verificação de e-mail',
  )
}

export interface ItemAvisoDiario {
  titulo: string
  tipoRotulo: string
  hora: string | null
  turmaNome: string | null
}

export async function enviarAvisoDiario(destino: string, itens: ItemAvisoDiario[]) {
  const linhas = itens
    .map((i) => {
      const partes = [i.tipoRotulo, i.hora ? `às ${i.hora}` : null, i.turmaNome].filter(Boolean)
      return `<li><strong>${i.titulo}</strong> — ${partes.join(' · ')}</li>`
    })
    .join('')

  await enviar(
    destino,
    itens.length === 1 ? 'Você tem 1 compromisso hoje — Diário' : `Você tem ${itens.length} compromissos hoje — Diário`,
    `
      <p>Bom dia! Hoje tem isso marcado na sua Agenda:</p>
      <ul>${linhas}</ul>
    `,
    'aviso diário de agenda',
  )
}
