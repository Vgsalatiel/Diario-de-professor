import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { autenticada, carregando, erroConexao, tentarConectarDeNovo } = useAuth()
  if (carregando) {
    return (
      <div className="tela-conexao">
        <p>Conectando ao servidor…</p>
        <p className="texto-suave">Se o Diário ficou um tempo sem uso, isso pode levar alguns segundos.</p>
      </div>
    )
  }
  if (erroConexao) {
    return (
      <div className="tela-conexao">
        <p>Não foi possível conectar ao servidor.</p>
        <p className="texto-suave">Confira sua internet. Seus dados e seu login continuam salvos.</p>
        <button className="btn btn-primario" onClick={tentarConectarDeNovo}>
          Tentar de novo
        </button>
      </div>
    )
  }
  if (!autenticada) return <Navigate to="/login" replace />
  return <>{children}</>
}
