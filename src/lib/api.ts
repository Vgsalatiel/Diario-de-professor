// Cliente HTTP para falar com o backend (Express + Prisma).
// Guarda o token JWT no localStorage e injeta ele em toda requisição autenticada.

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3333'
const CHAVE_TOKEN = 'diario:token'

let tokenAtual: string | null = null
try {
  tokenAtual = localStorage.getItem(CHAVE_TOKEN)
} catch {
  tokenAtual = null
}

export function definirToken(token: string | null): void {
  tokenAtual = token
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token)
    else localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    // armazenamento indisponível — segue só em memória
  }
}

export function obterToken(): string | null {
  return tokenAtual
}

// Callback disparado sempre que a API responde 401 (token ausente,
// inválido ou expirado) — o AuthContext usa isso pra deslogar
// automaticamente em vez de deixar a tela travada com dados vazios.
let aoFicarNaoAutorizado: (() => void) | null = null

export function definirCallbackNaoAutorizado(callback: (() => void) | null): void {
  aoFicarNaoAutorizado = callback
}

export class ApiError extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

async function requisicao<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opcoes.headers as Record<string, string> | undefined),
  }
  if (tokenAtual) headers.Authorization = `Bearer ${tokenAtual}`

  let resposta: Response
  try {
    resposta = await fetch(`${BASE_URL}${caminho}`, { ...opcoes, headers })
  } catch {
    throw new ApiError(0, 'Não foi possível falar com o servidor. Verifique sua conexão.')
  }

  if (resposta.status === 204) return undefined as T

  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    const mensagem =
      (dados && typeof dados === 'object' && 'erro' in dados && typeof dados.erro === 'string'
        ? dados.erro
        : null) ?? 'Não foi possível concluir a operação.'
    if (resposta.status === 401) aoFicarNaoAutorizado?.()
    throw new ApiError(resposta.status, mensagem)
  }
  return dados as T
}

export const api = {
  get: <T>(caminho: string) => requisicao<T>(caminho),
  post: <T>(caminho: string, corpo?: unknown) =>
    requisicao<T>(caminho, {
      method: 'POST',
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    }),
  patch: <T>(caminho: string, corpo?: unknown) =>
    requisicao<T>(caminho, {
      method: 'PATCH',
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    }),
  put: <T>(caminho: string, corpo?: unknown) =>
    requisicao<T>(caminho, {
      method: 'PUT',
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    }),
  delete: <T>(caminho: string) => requisicao<T>(caminho, { method: 'DELETE' }),
}
