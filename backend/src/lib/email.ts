import { Resend } from 'resend'

// Sem RESEND_API_KEY (ex.: rodando local sem configurar), não quebra o
// fluxo — só avisa no console e loga o link teria sido enviado.
const chave = process.env.RESEND_API_KEY
const resend = chave ? new Resend(chave) : null

const REMETENTE = process.env.EMAIL_FROM ?? 'Diário <onboarding@resend.dev>'

export async function enviarEmailRedefinicaoSenha(destino: string, link: string) {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY não configurada — link de redefinição para ${destino}: ${link}`,
    )
    return
  }

  // O SDK do Resend não lança exceção em erro da API — devolve
  // { data, error } — então precisa checar esse campo manualmente,
  // senão um envio que falhou passa por "sucesso" silenciosamente.
  const { error } = await resend.emails.send({
    from: REMETENTE,
    to: destino,
    subject: 'Redefinir sua senha — Diário',
    html: `
      <p>Você pediu para redefinir sua senha no Diário.</p>
      <p><a href="${link}">Clique aqui para criar uma nova senha</a></p>
      <p>Esse link vale por 1 hora. Se você não pediu isso, pode ignorar este e-mail.</p>
    `,
  })

  if (error) {
    console.error(`[email] Falha ao enviar redefinição de senha para ${destino}:`, error)
  }
}
