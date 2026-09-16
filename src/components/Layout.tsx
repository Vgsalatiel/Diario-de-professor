import { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/ThemeContext'
import { useAnoLetivo } from '../context/AnoLetivoContext'
import { useData } from '../context/DataContext'

const LINKS = [
  { to: '/', rotulo: 'Início', icone: '◧', exato: true },
  { to: '/turmas', rotulo: 'Turmas', icone: '▦' },
  { to: '/alunos', rotulo: 'Alunos', icone: '☺' },
  { to: '/notas', rotulo: 'Notas', icone: '✎' },
  { to: '/frequencia', rotulo: 'Frequência', icone: '☑' },
  { to: '/plano-de-aula', rotulo: 'Plano de aula', icone: '☰' },
  { to: '/agenda', rotulo: 'Agenda', icone: '▣' },
  { to: '/assistente', rotulo: 'Assistente IA', icone: '✦' },
  { to: '/perfil', rotulo: 'Perfil', icone: '◑' },
]

export function Layout() {
  const { professora, sair } = useAuth()
  const { tema, alternarTema } = useTema()
  const { turmas } = useData()
  const { anoAtivo, anoAtual, somenteLeitura, definirAnoAtivo } = useAnoLetivo()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)

  // Lista de anos letivos pra escolher: os que já têm turma cadastrada,
  // sempre incluindo o ano atual (mesmo sem nenhuma turma nele ainda).
  const anosLetivos = useMemo(() => {
    const anos = new Set(turmas.map((t) => t.anoLetivo).filter(Boolean))
    anos.add(anoAtual)
    return Array.from(anos).sort((a, b) => b.localeCompare(a))
  }, [turmas, anoAtual])

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
          <label className="ano-letivo-seletor" title="Ano letivo">
            <span className="sr-only">Ano letivo</span>
            <select
              className="select"
              value={anoAtivo}
              onChange={(e) => definirAnoAtivo(e.target.value)}
            >
              {anosLetivos.map((ano) => (
                <option key={ano} value={ano}>
                  {ano === anoAtual ? `${ano} (atual)` : ano}
                </option>
              ))}
            </select>
          </label>
          <button
            className="icon-btn tema-toggle"
            onClick={alternarTema}
            aria-label={tema === 'escuro' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={tema === 'escuro' ? 'Modo claro' : 'Modo escuro'}
          >
            {tema === 'escuro' ? '☀' : '☾'}
          </button>
        </header>
        {somenteLeitura && (
          <div className="aviso-somente-leitura">
            Visualizando o ano letivo {anoAtivo} — modo somente leitura. Volte pro ano{' '}
            {anoAtual} pra editar normalmente.
          </div>
        )}
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
