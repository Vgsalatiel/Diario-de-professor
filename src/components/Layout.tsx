import { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/ThemeContext'
import { useAnoLetivo } from '../context/AnoLetivoContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'

interface LinkNav {
  to: string
  rotulo: string
  icone: string
  exato?: boolean
}

const LINKS: LinkNav[] = [
  { to: '/', rotulo: 'Início', icone: '◧', exato: true },
  { to: '/turmas', rotulo: 'Turmas', icone: '▦' },
  { to: '/alunos', rotulo: 'Alunos', icone: '☺' },
  { to: '/notas', rotulo: 'Notas', icone: '✎' },
  { to: '/frequencia', rotulo: 'Presença', icone: '☑' },
  { to: '/historico', rotulo: 'Histórico', icone: '↻' },
  { to: '/plano-de-aula', rotulo: 'Plano de aula', icone: '▤' },
  { to: '/agenda', rotulo: 'Agenda', icone: '▣' },
  { to: '/assistente', rotulo: 'Assistente IA', icone: '✦' },
  { to: '/perfil', rotulo: 'Perfil', icone: '◑' },
]

const LINK_COORDENACAO: LinkNav = { to: '/coordenacao/professores', rotulo: 'Coordenação', icone: '◈' }

// Diretor(a) não dá aula (turma agora é da escola, atribuída por
// disciplina) — as telas de professor (Turmas, Notas, Presença, Histórico,
// Plano de aula, Assistente IA) ficam vazias/sem sentido pra essa conta.
// O menu fica só com o que faz sentido pra quem administra a escola
// inteira: visão de Alunos e Professores (escola toda), Agenda própria,
// Perfil e Coordenação (que ele já enxerga tudo).
const LINKS_ADMIN: LinkNav[] = [
  { to: '/', rotulo: 'Início', icone: '◧', exato: true },
  { to: '/alunos', rotulo: 'Alunos', icone: '☺' },
  { to: '/agenda', rotulo: 'Agenda', icone: '▣' },
  { to: '/professores', rotulo: 'Professores', icone: '⚙' },
  { to: '/perfil', rotulo: 'Perfil', icone: '◑' },
]

// Conta de coordenação pedagógica pura (sem ser também diretor) não dá
// aula — as telas de Notas/Presença/Plano de aula etc. não fazem sentido
// pra ela, então o menu fica só com o essencial: cada área da coordenação
// como item próprio (não abas dentro de uma única tela).
const LINKS_COORDENACAO: LinkNav[] = [
  { to: '/', rotulo: 'Início', icone: '◧', exato: true },
  { to: '/coordenacao/professores', rotulo: 'Professores', icone: '☺' },
  { to: '/coordenacao/turmas', rotulo: 'Turmas', icone: '▦' },
  { to: '/coordenacao/frequencia', rotulo: 'Frequência', icone: '☑' },
  { to: '/coordenacao/alunos', rotulo: 'Alunos', icone: '◑' },
  { to: '/coordenacao/calendario', rotulo: 'Calendário', icone: '▣' },
  { to: '/perfil', rotulo: 'Perfil', icone: '◔' },
  { to: '/coordenacao/observacoes', rotulo: 'Observações', icone: '✎' },
]

export function Layout() {
  const { professora, sair, reenviarVerificacao } = useAuth()
  const { tema, alternarTema } = useTema()
  const { turmas } = useData()
  const { anoAtivo, anoAtual, somenteLeitura, definirAnoAtivo } = useAnoLetivo()
  const { notificar } = useToast()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const [reenviando, setReenviando] = useState(false)

  async function onReenviarVerificacao() {
    setReenviando(true)
    const r = await reenviarVerificacao()
    notificar(r.ok ? 'E-mail de confirmação reenviado — confira sua caixa de entrada.' : (r.erro ?? 'Não foi possível reenviar.'))
    setReenviando(false)
  }

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

  const links = professora.isAdmin
    ? [...LINKS_ADMIN, LINK_COORDENACAO]
    : professora.isCoordenador
      ? LINKS_COORDENACAO
      : LINKS

  return (
    <div className="app">
      <aside className={`sidebar ${menuAberto ? 'aberta' : ''}`}>
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            ≡
          </span>
          <span className="brand-name">Diário</span>
          <button
            className="icon-btn sidebar-fechar"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
          >
            ✕
          </button>
        </div>

        <nav className="nav">
          {links.map((l) => (
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
              <span>{professora.materias.join(', ')}</span>
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
        {!professora.emailVerificado && (
          <div className="aviso-somente-leitura aviso-email">
            <span>Confirme seu e-mail ({professora.email}) — enviamos um link pra sua caixa de entrada.</span>
            <button
              className="btn btn-fantasma btn-pequeno"
              onClick={onReenviarVerificacao}
              disabled={reenviando}
            >
              {reenviando ? 'Reenviando...' : 'Reenviar e-mail'}
            </button>
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
