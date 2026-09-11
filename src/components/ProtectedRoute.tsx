import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { autenticada } = useAuth()
  if (!autenticada) return <Navigate to="/login" replace />
  return <>{children}</>
}
