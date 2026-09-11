import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import type { Periodo, SistemaPeriodo } from '../types'
import { calcularFrequencia, chavePresenca, proximoEstado } from '../lib/frequencia'
import { opcoesPeriodo, rotuloSistema, turmaInicial } from '../lib/periodos'
import { formatarData } from '../lib/eventos'
import {
  diaUtilMaisProximo,
  nomeDiaSemana,
  passoDiaUtil,
} from '../lib/diasUteis'
import { exportarFrequenciaExcel, exportarFrequenciaPDF } from '../lib/export'

export function Frequencia() {
  const { turmas, alunos, datasAula, frequencia, garantirDataAula, definirPresenca } =
    useData()

  const [escolaFiltro, setEscolaFiltro] = useState('todas')
  const [turmaId, setTurmaId] = useState<string>(() => turmaInicial(turmas))
  const [periodo, setPeriodo] = useState<Periodo>('1')
  const [data, setData] = useState<string>(() => diaUtilMaisProximo(hojeISO()))

  const escolas = useMemo(
    () =>
      Array.from(new Set(turmas.map((t) => t.escola).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [turmas],
  )

  // Sem opção "todas" aqui: com mais de uma escola, sempre uma fica ativa.
  const escolaAtiva = escolas.length > 1 && escolaFiltro === 'todas' ? escolas[0] : escolaFiltro

  const turmasDaEscola = useMemo(
    () =>
      escolaAtiva === 'todas' ? turmas : turmas.filter((t) => t.escola === escolaAtiva),
    [turmas, escolaAtiva],
  )

  function trocarEscola(e: string) {
    setEscolaFiltro(e)
    const disponiveis = turmas.filter((t) => t.escola === e)
    setTurmaId(disponiveis[0]?.id ?? '')
    setPeriodo('1')
  }

  function trocarTurma(id: string) {
    setTurmaId(id)
    setPeriodo('1')
  }

  const turmaAtual = turmas.find((t) => t.id === turmaId) ?? null
  const sistemaAtual: SistemaPeriodo = turmaAtual?.sistemaPeriodo ?? 'semestre'
  const periodosDisponiveis = opcoesPeriodo(sistemaAtual)
  const periodoAtivo: Periodo = periodosDisponiveis.some((p) => p.valor === periodo)
    ? periodo
    : '1'

  const alunosTurma = useMemo(
    () =>
      alunos
        .filter((a) => a.turmaId === turmaId)
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    [alunos, turmaId],
  )
  const datasDoPeriodo = useMemo(
    () => datasAula.filter((d) => d.turmaId === turmaId && d.periodo === periodoAtivo),
    [datasAula, turmaId, periodoAtivo],
  )
  const dataAulaHoje = datasAula.find((d) => d.turmaId === turmaId && d.data === data)

  function mudarData(novaData: string) {
    setData(novaData ? diaUtilMaisProximo(novaData) : novaData)
  }

  function onCelula(alunoId: string) {
    if (!turmaId) return
    const dataAulaId = garantirDataAula(turmaId, data, periodoAtivo)
    const atual = frequencia[chavePresenca(alunoId, dataAulaId)]
    definirPresenca(alunoId, dataAulaId, proximoEstado(atual))
  }

  function exportar(formato: 'excel' | 'pdf') {
    if (!turmaAtual) return
    const dados = { turma: turmaAtual, alunos: alunosTurma, datasAula: datasDoPeriodo, frequencia }
    if (formato === 'excel') exportarFrequenciaExcel(dados)
    else exportarFrequenciaPDF(dados)
  }

  if (turmas.length === 0) {
    return (
      <div className="stack-lg">
        <header className="pagina-head">
          <div>
            <h1>Frequência</h1>
          </div>
        </header>
        <div className="vazio painel">
          <p>Cadastre turmas e alunos para registrar frequência.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Frequência</h1>
          <p className="pagina-sub">
            Clique no nome do aluno: presente no primeiro clique, falta no
            segundo.
          </p>
        </div>
        <div className="grupo-botoes">
          <button className="btn btn-fantasma" onClick={() => exportar('excel')}>
            Exportar Excel
          </button>
          <button className="btn btn-fantasma" onClick={() => exportar('pdf')}>
            Exportar PDF
          </button>
        </div>
      </header>

      {escolas.length > 1 && (
        <div className="abas">
          {escolas.map((e) => (
            <button
              key={e}
              className={`aba ${escolaAtiva === e ? 'ativa' : ''}`}
              onClick={() => trocarEscola(e)}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="abas">
        {periodosDisponiveis.map((p) => (
          <button
            key={p.valor}
            className={`aba ${periodoAtivo === p.valor ? 'ativa' : ''}`}
            onClick={() => setPeriodo(p.valor)}
          >
            {p.rotulo}
          </button>
        ))}
      </div>

      <div className="barra-config">
        <label className="campo-inline">
          <span>Turma</span>
          <select
            className="select"
            value={turmaId}
            onChange={(e) => trocarTurma(e.target.value)}
          >
            {turmasDaEscola.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="campo-inline">
          <span>Dia da aula (dias úteis)</span>
          <div className="navegador-dia">
            <button
              type="button"
              className="btn btn-fantasma btn-pequeno"
              onClick={() => setData((d) => passoDiaUtil(d, -1))}
              aria-label="Dia útil anterior"
            >
              ‹
            </button>
            <input
              type="date"
              value={data}
              onChange={(e) => mudarData(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-fantasma btn-pequeno"
              onClick={() => setData((d) => passoDiaUtil(d, 1))}
              aria-label="Próximo dia útil"
            >
              ›
            </button>
          </div>
        </label>
      </div>

      {turmasDaEscola.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhuma turma nesta escola.</p>
        </div>
      ) : alunosTurma.length === 0 ? (
        <div className="vazio painel">
          <p>Esta turma ainda não tem alunos.</p>
        </div>
      ) : (
        <div className="grid-perfil">
          <section className="painel">
            <h2>
              {nomeDiaSemana(data)}, {formatarData(data)}
            </h2>
            <table className="tabela">
              <tbody>
                {alunosTurma.map((aluno) => {
                  const v = dataAulaHoje
                    ? frequencia[chavePresenca(aluno.id, dataAulaHoje.id)]
                    : undefined
                  const rotulo = v === true ? 'Presente' : v === false ? 'Falta' : '—'
                  const classe =
                    v === true
                      ? 'pill-aprovado'
                      : v === false
                        ? 'pill-recuperacao'
                        : 'pill-sem-nota'
                  return (
                    <tr key={aluno.id}>
                      <td className="celula-nome">{aluno.nome}</td>
                      <td className="col-acoes">
                        <button
                          type="button"
                          className={`pill pill-btn ${classe}`}
                          onClick={() => onCelula(aluno.id)}
                        >
                          {rotulo}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          <section className="painel">
            <h2>Resumo do {rotuloSistema(sistemaAtual).toLowerCase()}</h2>
            {datasDoPeriodo.length === 0 ? (
              <p className="texto-suave">
                Nenhuma frequência registrada neste{' '}
                {rotuloSistema(sistemaAtual).toLowerCase()} ainda.
              </p>
            ) : (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Presença</th>
                  </tr>
                </thead>
                <tbody>
                  {alunosTurma.map((aluno) => {
                    const resumo = calcularFrequencia(aluno.id, datasDoPeriodo, frequencia)
                    return (
                      <tr key={aluno.id}>
                        <td className="celula-nome">{aluno.nome}</td>
                        <td>
                          {resumo.percentual == null ? (
                            <span className="pill pill-sem-nota">—</span>
                          ) : (
                            <span
                              className={`pill ${resumo.percentual >= 75 ? 'pill-aprovado' : 'pill-recuperacao'}`}
                            >
                              {resumo.percentual}%
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}
