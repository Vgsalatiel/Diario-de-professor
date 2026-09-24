import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../lib/api'
import { formatarData } from '../lib/eventos'

interface EventoResumo {
  id: string
  titulo: string
  tipo?: string
  data: string
  hora: string | null
  turmaNome: string | null
}

interface DadosDashboard {
  data: string
  feriadoHoje: string | null
  totais: {
    professores: number
    turmas: number
    alunos: number
    frequenciaMedia: number | null
    alunosComBaixaFrequencia: number
  }
  hoje: { aulasPrevistas: number; aulasRegistradas: number; provas: number; reunioes: number; eventos: number }
  proximasProvas: EventoResumo[]
  proximasReunioes: EventoResumo[]
  proximosEventos: EventoResumo[]
  agendaHoje: EventoResumo[]
  pendencias: {
    turmasSemRegistroOntem: number
    turmasComAvaliacaoPendente: number
    professoresComPendencia: number
  }
}

function saudacao(): string {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function ListaResumo({ itens, vazio }: { itens: EventoResumo[]; vazio: string }) {
  if (itens.length === 0) return <p className="texto-suave">{vazio}</p>
  return (
    <ul className="lista-eventos">
      {itens.map((e) => (
        <li key={e.id} className="evento-item">
          <div className="evento-info">
            <strong>{e.titulo}</strong>
            {e.turmaNome && <span className="evento-turma">{e.turmaNome}</span>}
          </div>
          <span className="evento-data">
            {formatarData(e.data)}
            {e.hora ? ` · ${e.hora}` : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}

// Diretor: Alunos e Professores têm tela própria; Turmas mora dentro da
// Coordenação (que ele já enxerga tudo). Coordenação: cada aba já é uma
// rota própria dela mesma.
const LINK_PADRAO: Record<'professores' | 'turmas' | 'alunos', string> = {
  professores: '/professores',
  turmas: '/coordenacao/turmas',
  alunos: '/alunos',
}

interface DashboardDiretorProps {
  // Reaproveitado pela conta de coordenação pedagógica — mesmos números,
  // só que apontando pras rotas próprias dela em vez das do diretor.
  apiPath?: string
  montarLink?: (aba: 'professores' | 'turmas' | 'alunos') => string
  saudacaoRotulo?: string
}

export function DashboardDiretor({
  apiPath = '/admin/dashboard',
  montarLink = (aba) => LINK_PADRAO[aba],
  saudacaoRotulo = 'Diretor(a)',
}: DashboardDiretorProps) {
  const { professora } = useAuth()
  const [dados, setDados] = useState<DadosDashboard | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api
      .get<DadosDashboard>(apiPath)
      .then(setDados)
      .catch((e) => setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar.'))
  }, [apiPath])

  const primeiroNome = professora.nome.split(' ')[0] || saudacaoRotulo

  if (erro) {
    return (
      <div className="stack-lg">
        <div className="alerta-erro">{erro}</div>
      </div>
    )
  }

  if (!dados) {
    return (
      <div className="stack-lg">
        <p className="texto-suave">Carregando…</p>
      </div>
    )
  }

  const itensAtencao = [
    dados.totais.alunosComBaixaFrequencia > 0 && {
      texto: `${dados.totais.alunosComBaixaFrequencia} aluno(s) com baixa frequência.`,
      link: montarLink('alunos'),
    },
    dados.pendencias.professoresComPendencia > 0 && {
      texto: `${dados.pendencias.professoresComPendencia} professor(es) com registros pendentes.`,
      link: montarLink('professores'),
    },
    dados.pendencias.turmasSemRegistroOntem > 0 && {
      texto: `${dados.pendencias.turmasSemRegistroOntem} turma(s) sem registro da aula de ontem.`,
      link: montarLink('turmas'),
    },
    dados.pendencias.turmasComAvaliacaoPendente > 0 && {
      texto: `${dados.pendencias.turmasComAvaliacaoPendente} turma(s) com avaliação sem nenhuma nota lançada.`,
      link: montarLink('turmas'),
    },
  ].filter((item): item is { texto: string; link: string } => !!item)

  const eventosHojeTotal = dados.hoje.provas + dados.hoje.reunioes + dados.hoje.eventos

  const situacaoPedagogico = itensAtencao.length === 0
  const situacaoFrequencia =
    dados.totais.frequenciaMedia == null || dados.totais.alunosComBaixaFrequencia === 0

  return (
    <div className="stack-lg">
      <section className="hero">
        <p className="hero-saudacao">
          {saudacao()}, {primeiroNome} 👋
        </p>
        <h1 className="hero-titulo">Visão geral da escola — {formatarData(dados.data)}</h1>
        {dados.feriadoHoje && (
          <p className="texto-suave">📅 Hoje é feriado: {dados.feriadoHoje} — sem aula.</p>
        )}
      </section>

      <section className="cards-numero cards-numero-6">
        <Link to={montarLink('alunos')} className="card-numero card-numero-clicavel">
          <span className="card-numero-valor">{dados.totais.alunos}</span>
          <span className="card-numero-rotulo">Alunos</span>
        </Link>
        <Link to={montarLink('professores')} className="card-numero card-numero-clicavel">
          <span className="card-numero-valor">{dados.totais.professores}</span>
          <span className="card-numero-rotulo">Professores</span>
        </Link>
        <Link to={montarLink('turmas')} className="card-numero card-numero-clicavel">
          <span className="card-numero-valor">{dados.totais.turmas}</span>
          <span className="card-numero-rotulo">Turmas</span>
        </Link>
        <Link to={montarLink('turmas')} className="card-numero card-numero-clicavel">
          <span className="card-numero-valor">
            {dados.totais.frequenciaMedia == null ? '—' : `${dados.totais.frequenciaMedia}%`}
          </span>
          <span className="card-numero-rotulo">Frequência</span>
        </Link>
        <div className="card-numero">
          <span className="card-numero-valor">{dados.hoje.aulasPrevistas}</span>
          <span className="card-numero-rotulo">Aulas hoje</span>
        </div>
        <div className="card-numero">
          <span className="card-numero-valor">{eventosHojeTotal}</span>
          <span className="card-numero-rotulo">Eventos hoje</span>
        </div>
      </section>

      <section className="painel">
        <div className="painel-head">
          <h2>⚠️ Atenção</h2>
        </div>
        {itensAtencao.length === 0 ? (
          <p className="texto-suave">Nenhuma pendência no momento. 🎉</p>
        ) : (
          <ul className="lista-marcada">
            {itensAtencao.map((item) => (
              <li key={item.texto}>
                <Link to={item.link} className="link-acao">
                  {item.texto}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="painel">
        <div className="painel-head">
          <h2>📅 Agenda de hoje</h2>
        </div>
        {dados.agendaHoje.length === 0 ? (
          <p className="texto-suave">Nada agendado para hoje.</p>
        ) : (
          <ul className="lista-eventos">
            {dados.agendaHoje.map((e) => (
              <li key={e.id} className="evento-item">
                <span className="evento-data">{e.hora ?? '—'}</span>
                <div className="evento-info">
                  <strong>{e.titulo}</strong>
                  {e.turmaNome && <span className="evento-turma">{e.turmaNome}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="painel">
        <div className="painel-head">
          <h2>🏫 Situação da escola</h2>
        </div>
        <ul className="lista-situacao">
          <li>
            <span>Pedagógico</span>
            <span className="chip">
              <span
                className="ponto"
                style={{ background: situacaoPedagogico ? 'var(--verde-texto)' : 'var(--amber)' }}
              />
              {situacaoPedagogico ? 'Normal' : 'Atenção'}
            </span>
          </li>
          <li>
            <span>Frequência</span>
            <span className="chip">
              <span
                className="ponto"
                style={{ background: situacaoFrequencia ? 'var(--verde-texto)' : 'var(--amber)' }}
              />
              {situacaoFrequencia ? 'Normal' : 'Atenção'}
            </span>
          </li>
          <li>
            <span>Eventos</span>
            <span className="chip">
              <span
                className="ponto"
                style={{ background: eventosHojeTotal > 0 ? 'var(--indigo)' : 'var(--verde-texto)' }}
              />
              {eventosHojeTotal > 0 ? `${eventosHojeTotal} hoje` : 'Nenhum hoje'}
            </span>
          </li>
        </ul>
      </section>

      <div className="grid-perfil">
        <section className="painel">
          <div className="painel-head">
            <h2>Próximas provas</h2>
          </div>
          <ListaResumo itens={dados.proximasProvas} vazio="Nenhuma prova agendada." />
        </section>

        <section className="painel">
          <div className="painel-head">
            <h2>Próximas reuniões</h2>
          </div>
          <ListaResumo itens={dados.proximasReunioes} vazio="Nenhuma reunião agendada." />
        </section>
      </div>

      <section className="painel">
        <div className="painel-head">
          <h2>Próximos eventos</h2>
        </div>
        <ListaResumo itens={dados.proximosEventos} vazio="Nenhum evento agendado." />
      </section>
    </div>
  )
}
