import type { Request } from 'express'
import rateLimit from 'express-rate-limit'

// O Render coloca a API atrás da própria Cloudflare antes de chegar no
// nosso proxy — dois saltos, não um. Com "trust proxy" contando só um
// salto, o Express não consegue extrair de forma confiável o IP real do
// cliente a partir do X-Forwarded-For, e o rate limit acaba "perdendo" o
// cliente entre requisições. O Cloudflare, por sua vez, sempre injeta (e
// nunca deixa o cliente falsificar) o cabeçalho CF-Connecting-IP com o IP
// de verdade — usamos ele como chave sempre que presente.
function chaveDoCliente(req: Request): string {
  return (req.headers['cf-connecting-ip'] as string | undefined) ?? req.ip ?? 'sem-ip'
}

// Login: impede força bruta de senha — poucas tentativas por IP a cada
// 15 minutos, mas generoso o bastante pra não travar um professor que
// só errou a senha algumas vezes.
export const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: chaveDoCliente,
  message: { erro: 'Muitas tentativas de login. Aguarde alguns minutos e tente de novo.' },
})

// Cadastro: evita criar muitas contas em sequência a partir do mesmo IP.
export const limitadorRegistro = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: chaveDoCliente,
  message: { erro: 'Muitos cadastros em pouco tempo. Aguarde um pouco e tente de novo.' },
})

// Geração de exercícios por IA: cada chamada custa dinheiro de verdade no
// provedor (Gemini) — limite por IP evita uma conta gerando centenas em loop.
export const limitadorIA = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: chaveDoCliente,
  message: { erro: 'Muitas gerações de exercícios em pouco tempo. Aguarde um pouco.' },
})

// Esqueci senha: limite mais apertado — cada tentativa dispara um e-mail
// de verdade (custo real no provedor) mesmo quando o endereço não existe.
export const limitadorEsqueciSenha = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: chaveDoCliente,
  message: { erro: 'Muitos pedidos de redefinição. Aguarde um pouco e tente de novo.' },
})
