import { useEffect, useState } from 'react'
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
  totais: { professores: number; turmas: number; alunos: number }
  hoje: { aulasPrevistas: number; provas: number; reunioes: number; eventos: number }
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

export function DashboardDiretor() {
  const { professora } = useAuth()
  const [dados, setDados] = useState<DadosDashboard | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api
      .get<DadosDashboard>('/admin/dashboard')
      .then(setDados)
      .catch((e) => setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar.'))
  }, [])

  const primeiroNome = professora.nome.split(' ')[0] || 'Diretor(a)'

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
      </section>

      <section className="cards-numero">
        <div className="card-numero">
          <span className="card-numero-valor">{dados.totais.professores}</span>
          <span className="card-numero-rotulo">Professores</span>
        </div>
        <div className="card-numero">
          <span className="card-numero-valor">{dados.totais.turmas}</span>
          <span className="card-numero-rotulo">Turmas</span>
        </div>
        <div className="card-numero">
          <span className="card-numero-valor">{dados.totais.alunos}</span>
          <span className="card-numero-rotulo">Alunos</span>
        </div>
      </section>

      <section className="painel">
        <div className="painel-head">
          <h2>Hoje</h2>
        </div>
        <div className="cards-numero cards-numero-4">
          <div className="card-numero card-numero-pequeno">
            <span className="card-numero-valor">{dados.hoje.aulasPrevistas}</span>
            <span className="card-numero-rotulo">Aulas previstas</span>
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
                {dados.pendencias.turmasSemRegistroOntem} turma(s) sem registro da aula de ontem.
              </li>
            )}
            {dados.pendencias.turmasComAvaliacaoPendente > 0 && (
              <li>
                {dados.pendencias.turmasComAvaliacaoPendente} turma(s) com avaliação sem nenhuma nota lançada.
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
