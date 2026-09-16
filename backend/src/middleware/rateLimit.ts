import rateLimit from 'express-rate-limit'

// Login: impede força bruta de senha — poucas tentativas por IP a cada
// 15 minutos, mas generoso o bastante pra não travar um professor que
// só errou a senha algumas vezes.
export const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Aguarde alguns minutos e tente de novo.' },
})

// Cadastro: evita criar muitas contas em sequência a partir do mesmo IP.
export const limitadorRegistro = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitos cadastros em pouco tempo. Aguarde um pouco e tente de novo.' },
})

// Geração de exercícios por IA: cada chamada custa dinheiro de verdade no
// provedor (Gemini) — limite por IP evita uma conta gerando centenas em loop.
export const limitadorIA = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas gerações de exercícios em pouco tempo. Aguarde um pouco.' },
})

// Esqueci senha: limite mais apertado — cada tentativa dispara um e-mail
// de verdade (custo real no provedor) mesmo quando o endereço não existe.
export const limitadorEsqueciSenha = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitos pedidos de redefinição. Aguarde um pouco e tente de novo.' },
})
