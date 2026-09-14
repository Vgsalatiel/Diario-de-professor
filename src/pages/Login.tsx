import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Outros perfis de acesso (diretor, pais, alunos) ficam reservados para o
// futuro — por enquanto só o login de professor está implementado.

export function Login() {
  const { entrar, autenticada } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (autenticada) {
    navigate('/', { replace: true })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const r = await entrar(email, senha)
    setEnviando(false)
    if (r.ok) {
      navigate('/', { replace: true })
    } else {
      setErro(r.erro ?? 'Não foi possível entrar.')
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
          <p>
            Turmas, alunos, notas com média automática e a agenda de provas —
            sem planilhas soltas e sem contas na mão.
          </p>
        </div>
      </div>

      <div className="login-form-lado">
        <form className="login-form" onSubmit={onSubmit}>
          <h2>Entrar</h2>
          <p className="login-sub">Acesse sua conta para continuar.</p>

          <label className="campo">
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="campo">
            <span>Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {erro && <div className="alerta-erro">{erro}</div>}

          <button className="btn btn-primario btn-bloco" type="submit" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="login-dica">
            Ainda não tem perfil?{' '}
            <Link className="link-acao" to="/cadastro">
              Criar perfil
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
