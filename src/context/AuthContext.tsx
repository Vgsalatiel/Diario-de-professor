import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Professora } from '../types'
import { usePersistedState, novoId } from '../lib/storage'
import { professoraInicial } from '../data/seed'

interface AuthContextValue {
  professora: Professora
  autenticada: boolean
  entrar: (email: string, senha: string) => { ok: boolean; erro?: string }
  sair: () => void
  atualizarPerfil: (dados: Partial<Professora>) => void
  criarPerfil: (dados: Omit<Professora, 'id'>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [professoras, setProfessoras] = usePersistedState<Professora[]>('professoras', [
    professoraInicial,
  ])
  const [professoraId, setProfessoraId] = usePersistedState<string>(
    'professoraId',
    professoraInicial.id,
  )
  const [autenticada, setAutenticada] = usePersistedState<boolean>('sessao', false)

  const professora =
    professoras.find((p) => p.id === professoraId) ?? professoras[0] ?? professoraInicial

  const value = useMemo<AuthContextValue>(
    () => ({
      professora,
      autenticada,
      entrar: (email, senha) => {
        const encontrada = professoras.find(
          (p) =>
            p.email.toLowerCase() === email.trim().toLowerCase() && p.senha === senha,
        )
        if (encontrada) {
          setProfessoraId(encontrada.id)
          setAutenticada(true)
          return { ok: true }
        }
        return { ok: false, erro: 'E-mail ou senha incorretos.' }
      },
      sair: () => setAutenticada(false),
      atualizarPerfil: (dados) =>
        setProfessoras((ps) =>
          ps.map((p) => (p.id === professora.id ? { ...p, ...dados } : p)),
        ),
      criarPerfil: (dados) => {
        const id = novoId()
        setProfessoras((ps) => [...ps, { ...dados, id }])
        setProfessoraId(id)
        setAutenticada(true)
      },
    }),
    [professora, professoras, autenticada, setProfessoras, setProfessoraId, setAutenticada],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
