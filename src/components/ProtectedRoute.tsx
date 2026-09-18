import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  // true: só diretor(a) entra aqui (as telas normais, turmas/alunos/agenda
  // etc., continuam abertas pra diretor(a) também usar com os próprios dados).
  somenteAdmin?: boolean
}

export function ProtectedRoute({ children, somenteAdmin = false }: ProtectedRouteProps) {
  const { autenticada, carregando, professora } = useAuth()
  if (carregando) return null
  if (!autenticada) return <Navigate to="/login" replace />
  if (somenteAdmin && !professora.isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}
