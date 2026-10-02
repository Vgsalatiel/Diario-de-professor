import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { autenticada, carregando } = useAuth()
  if (carregando) return null
  if (!autenticada) return <Navigate to="/login" replace />
  return <>{children}</>
}
