import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'

export function VerificarEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [status, setStatus] = useState<'verificando' | 'ok' | 'erro'>('verificando')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('erro')
      setErro('Esse link está incompleto ou inválido.')
      return
    }
    api
      .post('/auth/verificar-email', { token })
      .then(() => setStatus('ok'))
      .catch((erro) => {
        setStatus('erro')
        setErro(erro instanceof ApiError ? erro.message : 'Não foi possível confirmar o e-mail.')
      })
  }, [token])

  return (
    <div className="login">
      <div className="login-arte">
        <div className="login-arte-conteudo">
          <div className="brand brand-grande">
            <span className="brand-mark" aria-hidden>
              ≡
            </span>
            <span className="brand-name">Diário</span>
          </div>
          <h1>Sua rotina de sala de aula, organizada num lugar só.</h1>
        </div>
      </div>

      <div className="login-form-lado">
        <div className="login-form">
          <h2>Confirmação de e-mail</h2>

          {status === 'verificando' && <p className="login-sub">Confirmando seu e-mail...</p>}

          {status === 'ok' && (
            <>
              <p className="login-sub">E-mail confirmado com sucesso! Sua conta já está ativa.</p>
              <Link className="btn btn-primario btn-bloco" to="/">
                Ir para o Diário
              </Link>
            </>
          )}

          {status === 'erro' && (
            <>
              <div className="alerta-erro">{erro}</div>
              <p className="login-dica">
                Você pode pedir um novo link de confirmação na tela de Perfil, depois de entrar.
              </p>
              <Link className="btn btn-primario btn-bloco" to="/login">
                Ir para o login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
