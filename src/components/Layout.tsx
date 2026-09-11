import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LINKS = [
  { to: '/', rotulo: 'Início', icone: '◧', exato: true },
  { to: '/turmas', rotulo: 'Turmas', icone: '▦' },
  { to: '/alunos', rotulo: 'Alunos', icone: '☺' },
  { to: '/notas', rotulo: 'Notas', icone: '✎' },
  { to: '/frequencia', rotulo: 'Frequência', icone: '☑' },
  { to: '/agenda', rotulo: 'Agenda', icone: '▣' },
  { to: '/assistente', rotulo: 'Assistente IA', icone: '✦' },
  { to: '/perfil', rotulo: 'Perfil', icone: '◑' },
]

export function Layout() {
  const { professora, sair } = useAuth()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)

  const iniciais = professora.nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <div className="app">
      <aside className={`sidebar ${menuAberto ? 'aberta' : ''}`}>
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            ≡
          </span>
          <span className="brand-name">Diário</span>
        </div>

        <nav className="nav">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.exato}
              className={({ isActive }) => `nav-link ${isActive ? 'ativo' : ''}`}
              onClick={() => setMenuAberto(false)}
            >
              <span className="nav-icone" aria-hidden>
                {l.icone}
              </span>
              {l.rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-rodape">
          <div className="mini-perfil">
            <div className="avatar avatar-sm">
              {professora.fotoUrl ? (
                <img src={professora.fotoUrl} alt="" />
              ) : (
                <span>{iniciais || '·'}</span>
              )}
            </div>
            <div className="mini-perfil-txt">
              <strong>{professora.nome}</strong>
              <span>{professora.materia}</span>
            </div>
          </div>
          <button
            className="btn btn-fantasma btn-bloco"
            onClick={() => {
              sair()
              navigate('/login')
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="conteudo">
        <header className="topbar">
          <button
            className="icon-btn menu-toggle"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label="Abrir menu"
          >
            ☰
          </button>
          <div className="topbar-titulo">Gestão de Notas e Aulas</div>
        </header>
        <main className="pagina">
          <Outlet />
        </main>
      </div>

      {menuAberto && (
        <div className="menu-backdrop" onClick={() => setMenuAberto(false)} />
      )}
    </div>
  )
}
