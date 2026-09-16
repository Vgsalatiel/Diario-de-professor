import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../lib/api'

export function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await api.post('/auth/esqueci-senha', { email })
      setEnviado(true)
    } catch (erro) {
      setErro(erro instanceof ApiError ? erro.message : 'Não foi possível enviar o e-mail.')
    } finally {
      setEnviando(false)
    }
  }

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
        <form className="login-form" onSubmit={onSubmit}>
          <h2>Esqueci minha senha</h2>
          {enviado ? (
            <>
              <p className="login-sub">
                Se esse e-mail estiver cadastrado, você vai receber um link para criar uma nova
                senha em instantes. Confira também a caixa de spam.
              </p>
              <Link className="btn btn-primario btn-bloco" to="/login">
                Voltar para o login
              </Link>
            </>
          ) : (
            <>
              <p className="login-sub">
                Informe o e-mail da sua conta — vamos te enviar um link pra redefinir a senha.
              </p>

              <label className="campo">
                <span>E-mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </label>

              {erro && <div className="alerta-erro">{erro}</div>}

              <button className="btn btn-primario btn-bloco" type="submit" disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>

              <p className="login-dica">
                <Link className="link-acao" to="/login">
                  Voltar para o login
                </Link>
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
