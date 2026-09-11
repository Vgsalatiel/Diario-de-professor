import { useRef, useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { lerImagemComprimida } from '../lib/imagem'

export function CadastroProfessor() {
  const { criarPerfil, autenticada } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [materia, setMateria] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [erro, setErro] = useState('')

  if (autenticada) {
    navigate('/', { replace: true })
  }

  function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    lerImagemComprimida(file).then(setFotoUrl)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')

    if (!nome.trim() || !email.trim() || !materia.trim()) {
      setErro('Preencha nome, e-mail e matéria.')
      return
    }
    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    criarPerfil({
      nome: nome.trim(),
      email: email.trim(),
      senha,
      materia: materia.trim(),
      fotoUrl,
    })
    navigate('/', { replace: true })
  }

  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

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
          <h1>Crie seu perfil e comece a organizar suas turmas.</h1>
          <p>
            Turmas, alunos, notas com média automática e a agenda de provas —
            sem planilhas soltas e sem contas na mão.
          </p>
        </div>
      </div>

      <div className="login-form-lado">
        <form className="login-form login-form-larga" onSubmit={onSubmit}>
          <h2>Criar perfil de professor</h2>
          <p className="login-sub">Cadastre seus dados para começar a usar o Diário.</p>

          <div className="cadastro-avatar">
            <div className="avatar avatar-lg">
              {fotoUrl ? (
                <img src={fotoUrl} alt="Foto do professor" />
              ) : (
                <span>{iniciais || '·'}</span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-fantasma btn-pequeno"
              onClick={() => fileRef.current?.click()}
            >
              Adicionar foto
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onFoto}
            />
          </div>

          <label className="campo">
            <span>Nome completo</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              required
            />
          </label>

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
            <span>Matéria</span>
            <input
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              placeholder="ex.: Matemática"
              required
            />
          </label>

          <label className="campo">
            <span>Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="campo">
            <span>Confirmar senha</span>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          {erro && <div className="alerta-erro">{erro}</div>}

          <button className="btn btn-primario btn-bloco" type="submit">
            Criar perfil
          </button>

          <p className="login-dica">
            Já tem um perfil? <Link className="link-acao" to="/login">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
