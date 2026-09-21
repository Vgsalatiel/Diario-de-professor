import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useAnoLetivo } from '../context/AnoLetivoContext'
import { rotuloTipo, corTipo, formatarData } from '../lib/eventos'
import { calcularFrequencia } from '../lib/frequencia'
import { chaveNota } from '../lib/media'
import { hojeISO } from '../lib/data'
import { DashboardDiretor } from './DashboardDiretor'

// Abaixo desse percentual de presença, o aluno entra na contagem de
// "baixa frequência" — mesmo corte usado na tela de Presença (pill verde
// vs vermelho), pra os números baterem em todo o sistema.
const LIMIAR_BAIXA_FREQUENCIA = 75

function diaAnteriorISO(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function Dashboard() {
  const { professora } = useAuth()
  const { turmas, alunos, eventos, avaliacoes, notas, datasAula, frequencia, registrosAula, feriados } =
    useData()
  const { anoAtivo } = useAnoLetivo()

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

  // Só as turmas do ano letivo ativo entram nas contas abaixo — pendência
  // de um ano anterior não é algo que precise de atenção hoje. Todas essas
  // informações já vêm da API só com os dados desse professor (o backend
  // nunca devolve turma/aluno de outro professor), então não precisa de
  // nenhum filtro extra aqui pra isso.
  const turmasDoAno = useMemo(
    () => turmas.filter((t) => t.anoLetivo === anoAtivo),
    [turmas, anoAtivo],
  )
  const feriadosSet = useMemo(() => new Set(feriados.map((f) => f.data)), [feriados])

  const alunosComBaixaFrequencia = useMemo(() => {
    let contagem = 0
    for (const turma of turmasDoAno) {
      const datasDaTurma = datasAula.filter((d) => d.turmaId === turma.id)
      if (datasDaTurma.length === 0) continue
      const alunosDaTurma = alunos.filter((a) => a.turmaId === turma.id)
      for (const aluno of alunosDaTurma) {
        const resumo = calcularFrequencia(aluno.id, datasDaTurma, frequencia)
        if (resumo.percentual != null && resumo.percentual < LIMIAR_BAIXA_FREQUENCIA) contagem++
      }
    }
    return contagem
  }, [turmasDoAno, alunos, datasAula, frequencia])

  const turmasSemRegistroOntem = useMemo(() => {
    const ontemISO = diaAnteriorISO(hojeISO())
    if (feriadosSet.has(ontemISO)) return []
    const diaSemana = new Date(ontemISO + 'T00:00:00').getDay()
    return turmasDoAno.filter(
      (t) =>
        t.diasAula.includes(diaSemana) &&
        !registrosAula.some((r) => r.turmaId === t.id && r.data === ontemISO),
    )
  }, [turmasDoAno, registrosAula, feriadosSet])

  const turmasComAvaliacaoPendente = useMemo(() => {
    const idsTurmasDoAno = new Set(turmasDoAno.map((t) => t.id))
    const nomesPendentes = new Set<string>()
    for (const av of avaliacoes) {
      if (!idsTurmasDoAno.has(av.turmaId)) continue
      const alunosDaTurma = alunos.filter((a) => a.turmaId === av.turmaId)
      const temAlgumaNota = alunosDaTurma.some((a) => notas[chaveNota(a.id, av.id)] != null)
      if (!temAlgumaNota) {
        const turma = turmasDoAno.find((t) => t.id === av.turmaId)
        if (turma) nomesPendentes.add(turma.nome)
      }
    }
    return Array.from(nomesPendentes)
  }, [turmasDoAno, avaliacoes, alunos, notas])

  const temPendencias = turmasSemRegistroOntem.length > 0 || turmasComAvaliacaoPendente.length > 0

  return (
    <div className="stack-lg">
      <section className="hero">
        <p className="hero-saudacao">Olá, {primeiroNome}</p>
        <h1 className="hero-titulo">
          Você tem {proximos.length}{' '}
          {proximos.length === 1 ? 'compromisso' : 'compromissos'} pela frente.
        </h1>
      </section>

      <section className="cards-numero cards-numero-4">
        <Link to="/turmas" className="card-numero card-numero-clicavel">
          <span className="card-numero-valor">{turmas.length}</span>
          <span className="card-numero-rotulo">Turmas cadastradas</span>
        </Link>
        <Link to="/alunos" className="card-numero card-numero-clicavel">
          <span className="card-numero-valor">{alunos.length}</span>
          <span className="card-numero-rotulo">Alunos</span>
        </Link>
        <Link to="/agenda" className="card-numero destaque card-numero-clicavel">
          <span className="card-numero-valor">{avaliacoesProximas}</span>
          <span className="card-numero-rotulo">Avaliações próximas</span>
        </Link>
        <Link
          to="/frequencia"
          className={`card-numero card-numero-clicavel ${alunosComBaixaFrequencia > 0 ? 'destaque' : ''}`}
        >
          <span className="card-numero-valor">{alunosComBaixaFrequencia}</span>
          <span className="card-numero-rotulo">Alunos com baixa frequência</span>
        </Link>
      </section>

      <section className="painel">
        <div className="painel-head">
          <h2>Pendências</h2>
        </div>
        {temPendencias ? (
          <ul className="lista-marcada">
            {turmasSemRegistroOntem.map((t) => (
              <li key={t.id}>
                <Link to="/plano-de-aula" className="link-acao">
                  {t.nome} — sem registro da aula de ontem.
                </Link>
              </li>
            ))}
            {turmasComAvaliacaoPendente.map((nome) => (
              <li key={nome}>
                <Link to="/notas" className="link-acao">
                  {nome} — tem avaliação sem nenhuma nota lançada.
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="texto-suave">Nenhuma pendência no momento. 🎉</p>
        )}
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
