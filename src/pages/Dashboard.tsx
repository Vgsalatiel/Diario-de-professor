import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useAnoLetivo } from '../context/AnoLetivoContext'
import { rotuloTipo, corTipo, formatarData } from '../lib/eventos'
import { calcularFrequencia } from '../lib/frequencia'
import { arredondar, calcularMedia, chaveNota, formatarNota } from '../lib/media'
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
  const { turmas, alunos, eventos, avaliacoes, notas, configs, datasAula, frequencia, registrosAula, feriados } =
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

  // Lista de verdade (não só a contagem) — pra dar pra mostrar quem são,
  // não só quantos são, direto no dashboard.
  const alunosComBaixaFrequenciaLista = useMemo(() => {
    const lista: { id: string; nome: string; turmaId: string; turmaNome: string; percentual: number }[] = []
    for (const turma of turmasDoAno) {
      const datasDaTurma = datasAula.filter((d) => d.turmaId === turma.id)
      if (datasDaTurma.length === 0) continue
      const alunosDaTurma = alunos.filter((a) => a.turmaId === turma.id)
      for (const aluno of alunosDaTurma) {
        const resumo = calcularFrequencia(aluno.id, datasDaTurma, frequencia)
        if (resumo.percentual != null && resumo.percentual < LIMIAR_BAIXA_FREQUENCIA) {
          lista.push({
            id: aluno.id,
            nome: aluno.nome,
            turmaId: turma.id,
            turmaNome: turma.nome,
            percentual: resumo.percentual,
          })
        }
      }
    }
    return lista.sort((a, b) => a.percentual - b.percentual)
  }, [turmasDoAno, alunos, datasAula, frequencia])

  const alunosComBaixaFrequencia = alunosComBaixaFrequenciaLista.length

  // Média geral das turmas do ano (só entram alunos que já têm alguma nota
  // lançada) + a lista de quem está abaixo da média de aprovação
  // configurada em cada turma — mesma regra usada em Notas.
  const { mediaGeralTurmas, alunosComNotaBaixaLista } = useMemo(() => {
    const todasMedias: number[] = []
    const baixas: { id: string; nome: string; turmaId: string; turmaNome: string; media: number }[] = []
    for (const turma of turmasDoAno) {
      const avaliacoesDaTurma = avaliacoes.filter((av) => av.turmaId === turma.id)
      if (avaliacoesDaTurma.length === 0) continue
      const config = configs.find((c) => c.turmaId === turma.id)
      const modelo = config?.modelo ?? 'simples'
      const mediaAprovacao = config?.mediaAprovacao ?? 6
      const alunosDaTurma = alunos.filter((a) => a.turmaId === turma.id)
      for (const aluno of alunosDaTurma) {
        const media = calcularMedia(aluno.id, avaliacoesDaTurma, notas, modelo)
        if (media == null) continue
        todasMedias.push(media)
        if (media < mediaAprovacao) {
          baixas.push({ id: aluno.id, nome: aluno.nome, turmaId: turma.id, turmaNome: turma.nome, media })
        }
      }
    }
    return {
      mediaGeralTurmas: todasMedias.length > 0 ? arredondar(todasMedias.reduce((a, b) => a + b, 0) / todasMedias.length) : null,
      alunosComNotaBaixaLista: baixas.sort((a, b) => a.media - b.media),
    }
  }, [turmasDoAno, avaliacoes, alunos, notas, configs])

  // Alunos com observação pedagógica ("dificuldades") registrada — o
  // campo já existe no cadastro do aluno, isso só reúne quem tem algo
  // escrito ali num lugar visível, pra não precisar abrir aluno por aluno.
  const alunosComDificuldadeLista = useMemo(() => {
    const lista: { id: string; nome: string; turmaId: string; turmaNome: string; dificuldades: string }[] = []
    for (const turma of turmasDoAno) {
      const alunosDaTurma = alunos.filter((a) => a.turmaId === turma.id)
      for (const aluno of alunosDaTurma) {
        if (aluno.dificuldades && aluno.dificuldades.trim()) {
          lista.push({
            id: aluno.id,
            nome: aluno.nome,
            turmaId: turma.id,
            turmaNome: turma.nome,
            dificuldades: aluno.dificuldades.trim(),
          })
        }
      }
    }
    return lista.sort((a, b) => a.nome.localeCompare(b.nome))
  }, [turmasDoAno, alunos])

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

  const temPendencias =
    turmasSemRegistroOntem.length > 0 ||
    turmasComAvaliacaoPendente.length > 0 ||
    alunosComBaixaFrequenciaLista.length > 0 ||
    alunosComNotaBaixaLista.length > 0 ||
    alunosComDificuldadeLista.length > 0

  return (
    <div className="stack-lg">
      <section className="hero">
        <p className="hero-saudacao">Olá, {primeiroNome}</p>
        <h1 className="hero-titulo">
          Você tem {proximos.length}{' '}
          {proximos.length === 1 ? 'compromisso' : 'compromissos'} pela frente.
        </h1>
      </section>

      <section className="cards-numero cards-numero-5">
        <Link to="/turmas" className="card-numero card-numero-clicavel">
          <span className="card-numero-valor">{turmas.length}</span>
          <span className="card-numero-rotulo">Turmas cadastradas</span>
        </Link>
        <Link to="/alunos" className="card-numero card-numero-clicavel">
          <span className="card-numero-valor">{alunos.length}</span>
          <span className="card-numero-rotulo">Alunos</span>
        </Link>
        <Link
          to="/agenda"
          className={`card-numero card-numero-clicavel ${avaliacoesProximas > 0 ? 'destaque' : ''}`}
        >
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
        <Link
          to="/notas"
          className={`card-numero card-numero-clicavel ${alunosComNotaBaixaLista.length > 0 ? 'destaque' : ''}`}
        >
          <span className="card-numero-valor">{formatarNota(mediaGeralTurmas)}</span>
          <span className="card-numero-rotulo">Média das turmas</span>
        </Link>
      </section>

      <section className="painel">
        <div className="painel-head">
          <h2>O que precisa da sua atenção</h2>
        </div>
        {temPendencias ? (
          <div className="stack-md">
            {(turmasSemRegistroOntem.length > 0 || turmasComAvaliacaoPendente.length > 0) && (
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
            )}
            {alunosComBaixaFrequenciaLista.length > 0 && (
              <div>
                <span className="texto-suave">Alunos com baixa frequência:</span>
                <ul className="lista-eventos">
                  {alunosComBaixaFrequenciaLista.map((a) => (
                    <li key={a.id} className="evento-item">
                      <div className="evento-info">
                        <Link to={`/alunos?turma=${a.turmaId}`} className="link-acao">
                          <strong>{a.nome}</strong>
                        </Link>
                        <span className="evento-turma">{a.turmaNome}</span>
                      </div>
                      <span className="pill pill-recuperacao">{a.percentual}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {alunosComNotaBaixaLista.length > 0 && (
              <div>
                <span className="texto-suave">Alunos com nota baixa:</span>
                <ul className="lista-eventos">
                  {alunosComNotaBaixaLista.map((a) => (
                    <li key={a.id} className="evento-item">
                      <div className="evento-info">
                        <Link to="/notas" className="link-acao">
                          <strong>{a.nome}</strong>
                        </Link>
                        <span className="evento-turma">{a.turmaNome}</span>
                      </div>
                      <span className="pill pill-recuperacao">{formatarNota(a.media)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {alunosComDificuldadeLista.length > 0 && (
              <div>
                <span className="texto-suave">Alunos com dificuldade registrada:</span>
                <ul className="lista-eventos">
                  {alunosComDificuldadeLista.map((a) => (
                    <li key={a.id} className="evento-item">
                      <div className="evento-info">
                        <Link to={`/alunos?turma=${a.turmaId}`} className="link-acao">
                          <strong>{a.nome}</strong>
                        </Link>
                        <span className="evento-turma">{a.turmaNome}</span>
                        <span className="texto-suave">
                          {a.dificuldades.length > 90 ? `${a.dificuldades.slice(0, 90)}…` : a.dificuldades}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
