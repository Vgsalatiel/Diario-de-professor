import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/ThemeContext'
import { useAnoLetivo } from '../context/AnoLetivoContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { Tour, TourProvider, chaveTourVisto } from './Tour'

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

export function Layout() {
  const { professora, sair, reenviarVerificacao } = useAuth()
  const { tema, alternarTema } = useTema()
  const { turmas, carregando, erroCarregamento, recarregar } = useData()
  const { anoAtivo, anoAtual, somenteLeitura, definirAnoAtivo } = useAnoLetivo()
  const { notificar } = useToast()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [tourAberto, setTourAberto] = useState(false)

  // Tour do menu: abre sozinho uma vez, no primeiro acesso de quem ainda não
  // tem turma; depois só pelo link "Fazer o tour" (Primeiros passos).
  useEffect(() => {
    if (carregando || erroCarregamento || !professora.id || turmas.length > 0) return
    let visto: string | null = null
    try {
      visto = localStorage.getItem(chaveTourVisto(professora.id))
    } catch {
      visto = 'indisponivel' // sem armazenamento, não insiste a cada visita
    }
    if (!visto) setTourAberto(true)
  }, [carregando, erroCarregamento, professora.id, turmas.length])

  const fecharTour = useCallback(() => {
    setTourAberto(false)
    try {
      localStorage.setItem(chaveTourVisto(professora.id), 'visto')
    } catch {
      // armazenamento indisponível
    }
  }, [professora.id])

  const tour = useMemo(() => ({ iniciarTour: () => setTourAberto(true) }), [])

  // Troca de tela pra quem usa leitor de tela: o título da aba muda e o foco
  // vai pro título (h1) da tela nova, que o leitor anuncia. Na primeira
  // abertura do app só muda o título, sem mexer no foco.
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const primeiraTela = useRef(true)
  useEffect(() => {
    const link = LINKS.find((l) => (l.exato ? pathname === l.to : pathname.startsWith(l.to)))
    document.title = link ? `${link.rotulo} — Diário` : 'Diário — Gestão de Notas e Aulas'
    if (primeiraTela.current) {
      primeiraTela.current = false
      return
    }
    const main = mainRef.current
    if (!main) return
    const focarTitulo = () => {
      const h1 = main.querySelector<HTMLElement>('h1')
      if (!h1) return false
      h1.tabIndex = -1
      h1.focus()
      return true
    }
    if (focarTitulo()) return
    // A tela é baixada sob demanda: espera o h1 aparecer (por até 5s).
    const obs = new MutationObserver(() => {
      if (focarTitulo()) obs.disconnect()
    })
    obs.observe(main, { childList: true, subtree: true })
    const limite = setTimeout(() => obs.disconnect(), 5000)
    return () => {
      obs.disconnect()
      clearTimeout(limite)
    }
  }, [pathname])

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
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.exato}
              className={({ isActive }) => `nav-link ${isActive ? 'ativo' : ''}`}
              data-tour={l.to}
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
        <main className="pagina" ref={mainRef}>
          {/* Sem isso as telas mostravam "Nenhuma turma cadastrada" enquanto
              os dados chegavam (ou se a busca falhasse), como se a conta
              estivesse vazia. */}
          {carregando ? (
            <div className="estado-carga" role="status">
              <span className="spinner" aria-hidden />
              <p>Carregando seus dados…</p>
            </div>
          ) : erroCarregamento ? (
            <div className="estado-carga" role="alert">
              <p>Não foi possível carregar seus dados.</p>
              <p className="texto-suave">{erroCarregamento}</p>
              <button className="btn btn-primario" onClick={recarregar}>
                Tentar de novo
              </button>
            </div>
          ) : (
            <TourProvider value={tour}>
              {/* As telas são baixadas sob demanda (ver App.tsx). */}
              <Suspense
                fallback={
                  <div className="estado-carga" role="status">
                    <span className="spinner" aria-hidden />
                    <p>Carregando…</p>
                  </div>
                }
              >
                <Outlet />
              </Suspense>
            </TourProvider>
          )}
        </main>
      </div>

      {menuAberto && (
        <div className="menu-backdrop" onClick={() => setMenuAberto(false)} />
      )}

      <Tour aberto={tourAberto} onFechar={fecharTour} definirMenuAberto={setMenuAberto} />
    </div>
  )
}
