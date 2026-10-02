import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Professora } from '../types'
import {
  api,
  ApiError,
  definirCallbackNaoAutorizado,
  definirToken,
  obterToken,
} from '../lib/api'

interface DadosCadastro {
  nome: string
  email: string
  senha: string
  materias: string[]
  fotoUrl?: string
}

interface DadosAtualizacao {
  nome?: string
  email?: string
  materias?: string[]
  fotoUrl?: string
  senha?: string
}

interface Resultado {
  ok: boolean
  erro?: string
}

interface AuthContextValue {
  professora: Professora
  autenticada: boolean
  carregando: boolean
  // true quando o servidor não respondeu ao abrir o app (rede/servidor
  // fora do ar) — o login continua guardado e dá pra tentar de novo.
  erroConexao: boolean
  tentarConectarDeNovo: () => void
  entrar: (email: string, senha: string) => Promise<Resultado>
  sair: () => void
  atualizarPerfil: (dados: DadosAtualizacao) => Promise<Resultado>
  criarPerfil: (dados: DadosCadastro) => Promise<Resultado>
  reenviarVerificacao: () => Promise<Resultado>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const PROFESSORA_VAZIA: Professora = {
  id: '',
  nome: '',
  email: '',
  materias: [],
  emailVerificado: false,
}

function mensagemErro(erro: unknown): string {
  if (erro instanceof ApiError) return erro.message
  return 'Não foi possível concluir a operação.'
}

// Esperas entre tentativas de buscar o perfil ao abrir o app (~30s no
// total) — o backend no Render dorme sem uso e leva um tempo pra acordar.
const ESPERAS_RECONEXAO_MS = [2000, 4000, 8000, 16000]

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function AuthProvider({ children }: { children: ReactNode }) {
  const [professora, setProfessora] = useState<Professora | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erroConexao, setErroConexao] = useState(false)

  // Só desloga se o servidor recusar o token (401). Falha de rede ou erro
  // 5xx (servidor acordando) tenta de novo e, se não der, mostra a tela de
  // "sem conexão" mantendo o login.
  const carregarPerfil = useCallback(async () => {
    if (!obterToken()) {
      setCarregando(false)
      return
    }
    setCarregando(true)
    setErroConexao(false)
    for (let tentativa = 0; ; tentativa++) {
      try {
        setProfessora(await api.get<Professora>('/auth/perfil'))
        break
      } catch (erro) {
        const temporario = erro instanceof ApiError && (erro.status === 0 || erro.status >= 500)
        if (!temporario) {
          definirToken(null)
          setProfessora(null)
          break
        }
        if (tentativa >= ESPERAS_RECONEXAO_MS.length) {
          setErroConexao(true)
          break
        }
        await esperar(ESPERAS_RECONEXAO_MS[tentativa])
      }
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    void carregarPerfil()
  }, [carregarPerfil])

  // Se o token expirar/ficar inválido a qualquer momento (qualquer
  // chamada à API pode responder 401), desloga automaticamente em vez de
  // deixar a tela travada com dados vazios e só um aviso de erro.
  useEffect(() => {
    definirCallbackNaoAutorizado(() => {
      if (obterToken()) {
        definirToken(null)
        setProfessora(null)
      }
    })
    return () => definirCallbackNaoAutorizado(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      professora: professora ?? PROFESSORA_VAZIA,
      autenticada: professora != null,
      carregando,
      erroConexao,
      tentarConectarDeNovo: () => void carregarPerfil(),
      entrar: async (email, senha) => {
        try {
          const resposta = await api.post<{ token: string; professor: Professora }>(
            '/auth/login',
            { email, senha },
          )
          definirToken(resposta.token)
          setProfessora(resposta.professor)
          return { ok: true }
        } catch (erro) {
          return { ok: false, erro: mensagemErro(erro) }
        }
      },
      sair: () => {
        definirToken(null)
        setProfessora(null)
      },
      atualizarPerfil: async (dados) => {
        try {
          const atualizada = await api.patch<Professora>('/auth/perfil', dados)
          setProfessora(atualizada)
          return { ok: true }
        } catch (erro) {
          return { ok: false, erro: mensagemErro(erro) }
        }
      },
      criarPerfil: async (dados) => {
        try {
          const resposta = await api.post<{ token: string; professor: Professora }>(
            '/auth/registro',
            dados,
          )
          definirToken(resposta.token)
          setProfessora(resposta.professor)
          return { ok: true }
        } catch (erro) {
          return { ok: false, erro: mensagemErro(erro) }
        }
      },
      reenviarVerificacao: async () => {
        try {
          await api.post('/auth/reenviar-verificacao')
          return { ok: true }
        } catch (erro) {
          return { ok: false, erro: mensagemErro(erro) }
        }
      },
    }),
    [professora, carregando, erroConexao, carregarPerfil],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
