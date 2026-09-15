import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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
  materia: string
  fotoUrl?: string
}

interface DadosAtualizacao {
  nome?: string
  email?: string
  materia?: string
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
  entrar: (email: string, senha: string) => Promise<Resultado>
  sair: () => void
  atualizarPerfil: (dados: DadosAtualizacao) => Promise<Resultado>
  criarPerfil: (dados: DadosCadastro) => Promise<Resultado>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const PROFESSORA_VAZIA: Professora = { id: '', nome: '', email: '', materia: '' }

function mensagemErro(erro: unknown): string {
  if (erro instanceof ApiError) return erro.message
  return 'Não foi possível concluir a operação.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [professora, setProfessora] = useState<Professora | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const token = obterToken()
    if (!token) {
      setCarregando(false)
      return
    }
    api
      .get<Professora>('/auth/perfil')
      .then((p) => setProfessora(p))
      .catch(() => {
        definirToken(null)
        setProfessora(null)
      })
      .finally(() => setCarregando(false))
  }, [])

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
    }),
    [professora, carregando],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
