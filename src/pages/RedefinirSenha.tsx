import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'

export function RedefinirSenha() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (senha !== confirmacao) {
      setErro('As senhas não coincidem.')
      return
    }
    setEnviando(true)
    try {
      await api.post('/auth/redefinir-senha', { token, novaSenha: senha })
      navigate('/login', { replace: true })
    } catch (erro) {
      setErro(erro instanceof ApiError ? erro.message : 'Não foi possível redefinir a senha.')
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
          <h2>Criar nova senha</h2>

          {!token ? (
            <>
              <p className="login-sub">
                Esse link está incompleto ou inválido. Peça uma nova redefinição.
              </p>
              <Link className="btn btn-primario btn-bloco" to="/esqueci-senha">
                Pedir novo link
              </Link>
            </>
          ) : (
            <>
              <p className="login-sub">Escolha uma nova senha para sua conta.</p>

              <label className="campo">
                <span>Nova senha</span>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                  required
                  minLength={6}
                />
              </label>

              <label className="campo">
                <span>Confirmar nova senha</span>
                <input
                  type="password"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </label>

              {erro && <div className="alerta-erro">{erro}</div>}

              <button className="btn btn-primario btn-bloco" type="submit" disabled={enviando}>
                {enviando ? 'Salvando...' : 'Salvar nova senha'}
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
