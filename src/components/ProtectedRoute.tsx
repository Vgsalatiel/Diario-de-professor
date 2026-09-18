import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  // true: só diretor(a) entra aqui, professor comum é redirecionado pra "/".
  // false (padrão): só professor comum entra aqui, diretor(a) é redirecionado
  // pro painel de administração — a conta de diretor não usa as telas normais.
  somenteAdmin?: boolean
}

export function ProtectedRoute({ children, somenteAdmin = false }: ProtectedRouteProps) {
  const { autenticada, carregando, professora } = useAuth()
  if (carregando) return null
  if (!autenticada) return <Navigate to="/login" replace />
  if (somenteAdmin && !professora.isAdmin) return <Navigate to="/" replace />
  if (!somenteAdmin && professora.isAdmin) return <Navigate to="/admin" replace />
  return <>{children}</>
}
