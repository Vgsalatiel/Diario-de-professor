import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { rotuloTipo, corTipo, formatarData } from '../lib/eventos'
import { DashboardDiretor } from './DashboardDiretor'

export function Dashboard() {
  const { professora } = useAuth()
  const { turmas, alunos, eventos } = useData()

  if (professora.isAdmin) return <DashboardDiretor />

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const proximos = [...eventos]
    .filter((e) => new Date(e.data + 'T00:00:00') >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data))

  const avaliacoesProximas = proximos.filter(
    (e) => e.tipo === 'prova' || e.tipo === 'trabalho',
  ).length

  const primeiroNome = professora.nome.split(' ')[0] || 'Professora'

  return (
    <div className="stack-lg">
      <section className="hero">
        <p className="hero-saudacao">Olá, {primeiroNome}</p>
        <h1 className="hero-titulo">
          Você tem {proximos.length}{' '}
          {proximos.length === 1 ? 'compromisso' : 'compromissos'} pela frente.
        </h1>
      </section>

      <section className="cards-numero">
        <Link to="/turmas" className="card-numero">
          <span className="card-numero-valor">{turmas.length}</span>
          <span className="card-numero-rotulo">Turmas cadastradas</span>
        </Link>
        <Link to="/alunos" className="card-numero">
          <span className="card-numero-valor">{alunos.length}</span>
          <span className="card-numero-rotulo">Alunos</span>
        </Link>
        <Link to="/agenda" className="card-numero destaque">
          <span className="card-numero-valor">{avaliacoesProximas}</span>
          <span className="card-numero-rotulo">Avaliações próximas</span>
        </Link>
      </section>

      <section className="painel">
        <div className="painel-head">
          <h2>Próximos eventos</h2>
          <Link to="/agenda" className="link-acao">
            Ver agenda
          </Link>
        </div>

        {proximos.length === 0 ? (
          <div className="vazio">
            <p>Nenhum compromisso agendado.</p>
            <Link to="/agenda" className="btn btn-primario">
              Adicionar evento
            </Link>
          </div>
        ) : (
          <ul className="lista-eventos">
            {proximos.slice(0, 6).map((e) => {
              const turma = turmas.find((t) => t.id === e.turmaId)
              return (
                <li key={e.id} className="evento-item">
                  <span
                    className="evento-tag"
                    style={{ background: corTipo(e.tipo) }}
                  >
                    {rotuloTipo(e.tipo)}
                  </span>
                  <div className="evento-info">
                    <strong>{e.titulo}</strong>
                    {turma && <span className="evento-turma">{turma.nome}</span>}
                  </div>
                  <span className="evento-data">
                    {formatarData(e.data)}
                    {e.hora ? ` · ${e.hora}` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
