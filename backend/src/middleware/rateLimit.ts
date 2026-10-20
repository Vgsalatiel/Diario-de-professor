import type { Request } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

// O Render coloca a API atrás da própria Cloudflare antes de chegar no
// nosso proxy — dois saltos, não um. Com "trust proxy" contando só um
// salto, o Express não consegue extrair de forma confiável o IP real do
// cliente a partir do X-Forwarded-For, e o rate limit acaba "perdendo" o
// cliente entre requisições. O Cloudflare, por sua vez, sempre injeta (e
// nunca deixa o cliente falsificar) o cabeçalho CF-Connecting-IP com o IP
// de verdade — usamos ele como chave sempre que presente.
function chaveDoCliente(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'] as string | undefined
  // ipKeyGenerator normaliza IPv6 (agrupa por /64, como recomenda o próprio
  // express-rate-limit) — sem isso, cada IPv6 "quase igual" viraria uma
  // chave diferente, e a lib lança erro se detectar um IPv6 crudo aqui.
  return ipKeyGenerator(cfIp ?? req.ip ?? '0.0.0.0')
}

// Login: impede força bruta de senha sem travar a sala dos professores.
// Numa escola todo mundo sai pelo mesmo IP (Wi-Fi), então:
// - só tentativas que FALHARAM contam (skipSuccessfulRequests);
// - o limite apertado é por conta (e-mail): 5 senhas erradas em 15 min;
// - por IP fica um teto largo, contra quem testa muitas contas da mesma rede.
function chaveDaConta(req: Request): string {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  return email ? `conta:${email}` : chaveDoCliente(req)
}

const MENSAGEM_LOGIN = { erro: 'Muitas tentativas de login. Aguarde alguns minutos e tente de novo.' }

export const limitadorLoginPorConta = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: chaveDaConta,
  message: MENSAGEM_LOGIN,
})

export const limitadorLoginPorRede = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: chaveDoCliente,
  message: MENSAGEM_LOGIN,
})

// Links de redefinir senha / confirmar e-mail: freia quem tenta adivinhar
// o token. Também só conta as tentativas que falharam.
export const limitadorTokens = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: chaveDoCliente,
  message: { erro: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.' },
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

// Rotas de IA ficam depois de autenticar: conta por professor, não por IP
// — professores na mesma rede (Wi-Fi da escola) não dividem a cota.
function chaveDoProfessor(req: Request): string {
  return req.professorId ? `professor:${req.professorId}` : chaveDoCliente(req)
}

// Cada chamada ao Gemini custa cota/dinheiro de verdade — o limite evita
// uma conta gerando centenas em loop.
export const limitadorExerciciosIA = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: chaveDoProfessor,
  message: { erro: 'Muitas gerações de exercícios em pouco tempo. Aguarde um pouco.' },
})

export const limitadorPlanoIA = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: chaveDoProfessor,
  message: { erro: 'Muitos planos gerados por IA em pouco tempo. Aguarde um pouco.' },
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
