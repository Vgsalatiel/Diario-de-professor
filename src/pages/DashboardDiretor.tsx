import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../lib/api'
import { formatarData } from '../lib/eventos'

interface EventoResumo {
  id: string
  titulo: string
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
  pendencias: { turmasSemRegistroOntem: number; turmasComAvaliacaoPendente: number }
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

interface DashboardDiretorProps {
  // Reaproveitado pela conta de coordenação pedagógica — mesmos números,
  // só que apontando pra /coordenacao em vez de /admin.
  apiPath?: string
  linkBase?: string
  saudacaoRotulo?: string
}

export function DashboardDiretor({
  apiPath = '/admin/dashboard',
  linkBase = '/admin',
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

  const semPendencias =
    dados.pendencias.turmasSemRegistroOntem === 0 && dados.pendencias.turmasComAvaliacaoPendente === 0

  return (
    <div className="stack-lg">
      <section className="hero">
        <p className="hero-saudacao">
          {saudacao()}, {primeiroNome}!
        </p>
        <h1 className="hero-titulo">Hoje: {formatarData(dados.data)}</h1>
        {dados.feriadoHoje && (
          <p className="texto-suave">📅 Hoje é feriado: {dados.feriadoHoje} — sem aula.</p>
        )}
      </section>

      <section className="cards-numero">
        <Link to={`${linkBase}?aba=professores`} className="card-numero card-numero-clicavel">
          <span className="card-numero-valor">{dados.totais.professores}</span>
          <span className="card-numero-rotulo">Professores</span>
        </Link>
        <Link to={`${linkBase}?aba=turmas`} className="card-numero card-numero-clicavel">
          <span className="card-numero-valor">{dados.totais.turmas}</span>
          <span className="card-numero-rotulo">Turmas</span>
        </Link>
        <Link to={`${linkBase}?aba=alunos`} className="card-numero card-numero-clicavel">
          <span className="card-numero-valor">{dados.totais.alunos}</span>
          <span className="card-numero-rotulo">Alunos</span>
        </Link>
      </section>

      <section className="cards-numero">
        <Link to={`${linkBase}?aba=turmas`} className="card-numero card-numero-clicavel">
          <span className="card-numero-valor">
            {dados.totais.frequenciaMedia == null ? '—' : `${dados.totais.frequenciaMedia}%`}
          </span>
          <span className="card-numero-rotulo">Frequência média da escola</span>
        </Link>
        <Link
          to={`${linkBase}?aba=alunos`}
          className={`card-numero card-numero-clicavel ${dados.totais.alunosComBaixaFrequencia > 0 ? 'destaque' : ''}`}
        >
          <span className="card-numero-valor">{dados.totais.alunosComBaixaFrequencia}</span>
          <span className="card-numero-rotulo">Alunos com baixa frequência</span>
        </Link>
      </section>

      <section className="painel">
        <div className="painel-head">
          <h2>Hoje</h2>
        </div>
        <div className="cards-numero cards-numero-5">
          <div className="card-numero card-numero-pequeno">
            <span className="card-numero-valor">{dados.hoje.aulasPrevistas}</span>
            <span className="card-numero-rotulo">Aulas previstas</span>
          </div>
          <div className="card-numero card-numero-pequeno">
            <span className="card-numero-valor">{dados.hoje.aulasRegistradas}</span>
            <span className="card-numero-rotulo">Aulas registradas</span>
          </div>
          <div className="card-numero card-numero-pequeno">
            <span className="card-numero-valor">{dados.hoje.provas}</span>
            <span className="card-numero-rotulo">Provas</span>
          </div>
          <div className="card-numero card-numero-pequeno">
            <span className="card-numero-valor">{dados.hoje.reunioes}</span>
            <span className="card-numero-rotulo">Reuniões</span>
          </div>
          <div className="card-numero card-numero-pequeno">
            <span className="card-numero-valor">{dados.hoje.eventos}</span>
            <span className="card-numero-rotulo">Outros eventos</span>
          </div>
        </div>
      </section>

      <section className="painel">
        <div className="painel-head">
          <h2>Pendências</h2>
        </div>
        {semPendencias ? (
          <p className="texto-suave">Nenhuma pendência no momento. 🎉</p>
        ) : (
          <ul className="lista-marcada">
            {dados.pendencias.turmasSemRegistroOntem > 0 && (
              <li>
                <Link to={`${linkBase}?aba=turmas`} className="link-acao">
                  {dados.pendencias.turmasSemRegistroOntem} turma(s) sem registro da aula de ontem.
                </Link>
              </li>
            )}
            {dados.pendencias.turmasComAvaliacaoPendente > 0 && (
              <li>
                <Link to={`${linkBase}?aba=turmas`} className="link-acao">
                  {dados.pendencias.turmasComAvaliacaoPendente} turma(s) com avaliação sem nenhuma nota lançada.
                </Link>
              </li>
            )}
          </ul>
        )}
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
