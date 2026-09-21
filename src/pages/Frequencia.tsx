import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useAnoLetivo } from '../context/AnoLetivoContext'
import type { Periodo, SistemaPeriodo } from '../types'
import { chavePresenca, proximoEstado } from '../lib/frequencia'
import { opcoesPeriodo, turmaInicial } from '../lib/periodos'
import { formatarData } from '../lib/eventos'
import { hojeISO } from '../lib/data'
import {
  diaValidoMaisProximo,
  nomeDiaSemana,
  passoDiaValido,
} from '../lib/diasUteis'
import { Modal } from '../components/Modal'
import { EditorRico } from '../components/EditorRico'
import { resumoTexto } from '../lib/texto'

const DIAS_UTEIS_PADRAO = [1, 2, 3, 4, 5]
import { exportarFrequenciaExcel, exportarFrequenciaPDF } from '../lib/export'

export function Frequencia() {
  const {
    turmas,
    alunos,
    datasAula,
    frequencia,
    garantirDataAula,
    definirPresenca,
    alternarSemAula,
    planosDeAula,
    registrosAula,
    definirRegistroAula,
    feriados,
  } = useData()
  const { notificar } = useToast()
  const { anoAtivo, somenteLeitura } = useAnoLetivo()

  const feriadosSet = useMemo(() => new Set(feriados.map((f) => f.data)), [feriados])

  const [escolaFiltro, setEscolaFiltro] = useState('todas')
  const [turmaId, setTurmaId] = useState<string>(() =>
    turmaInicial(turmas.filter((t) => t.anoLetivo === anoAtivo)),
  )
  const [periodo, setPeriodo] = useState<Periodo>('1')
  const [data, setData] = useState<string>(() => {
    const turma = turmas.find((t) => t.id === turmaId)
    return diaValidoMaisProximo(hojeISO(), turma?.diasAula ?? DIAS_UTEIS_PADRAO, feriadosSet)
  })

  // As turmas chegam da API de forma assíncrona — se a página monta antes
  // da primeira turma carregar, escolhe a turma (e um dia válido) assim
  // que a lista chegar.
  useEffect(() => {
    if (!turmaId && turmas.length > 0) {
      const id = turmaInicial(turmas.filter((t) => t.anoLetivo === anoAtivo))
      const turma = turmas.find((t) => t.id === id)
      setTurmaId(id)
      setData((d) => diaValidoMaisProximo(d, turma?.diasAula ?? DIAS_UTEIS_PADRAO, feriadosSet))
    }
  }, [turmas, turmaId, feriadosSet, anoAtivo])

  const turmasDoAno = useMemo(
    () => turmas.filter((t) => t.anoLetivo === anoAtivo),
    [turmas, anoAtivo],
  )

  const escolas = useMemo(
    () =>
      Array.from(new Set(turmasDoAno.map((t) => t.escola).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [turmasDoAno],
  )

  // Sem opção "todas" aqui: com mais de uma escola, sempre uma fica ativa.
  const escolaAtiva = escolas.length > 1 && escolaFiltro === 'todas' ? escolas[0] : escolaFiltro

  const turmasDaEscola = useMemo(
    () =>
      escolaAtiva === 'todas' ? turmasDoAno : turmasDoAno.filter((t) => t.escola === escolaAtiva),
    [turmasDoAno, escolaAtiva],
  )

  function trocarEscola(e: string) {
    setEscolaFiltro(e)
    const disponiveis = turmasDoAno.filter((t) => t.escola === e)
    const novaTurma = disponiveis[0]
    setTurmaId(novaTurma?.id ?? '')
    setPeriodo('1')
    setData((d) => diaValidoMaisProximo(d, novaTurma?.diasAula ?? DIAS_UTEIS_PADRAO, feriadosSet))
  }

  function trocarTurma(id: string) {
    setTurmaId(id)
    setPeriodo('1')
    const turma = turmas.find((t) => t.id === id)
    setData((d) => diaValidoMaisProximo(d, turma?.diasAula ?? DIAS_UTEIS_PADRAO, feriadosSet))
  }

  const turmaAtual = turmas.find((t) => t.id === turmaId) ?? null
  const sistemaAtual: SistemaPeriodo = turmaAtual?.sistemaPeriodo ?? 'semestre'
  const diasAulaAtual = turmaAtual?.diasAula ?? DIAS_UTEIS_PADRAO
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
  const semAulaHoje = dataAulaHoje?.semAula ?? false

  function mudarData(novaData: string) {
    setData(novaData ? diaValidoMaisProximo(novaData, diasAulaAtual, feriadosSet) : novaData)
  }

  const feriadoHoje = feriados.find((f) => f.data === data)

  async function onCelula(alunoId: string) {
    if (!turmaId || semAulaHoje) return
    try {
      const dataAulaId = await garantirDataAula(turmaId, data, periodoAtivo)
      const atual = frequencia[chavePresenca(alunoId, dataAulaId)]
      definirPresenca(alunoId, dataAulaId, proximoEstado(atual))
    } catch {
      // erro já notificado pelo DataContext
    }
  }

  function onSemAula() {
    if (!turmaId) return
    alternarSemAula(turmaId, data, periodoAtivo)
  }

  const registroDoDia = registrosAula.find((r) => r.turmaId === turmaId && r.data === data)
  const planosAtivosNoDia = useMemo(
    () =>
      planosDeAula.filter(
        (p) => p.turmaId === turmaId && p.dataInicio <= data && data <= p.dataFim,
      ),
    [planosDeAula, turmaId, data],
  )

  const [modalAula, setModalAula] = useState(false)
  const [resumoAula, setResumoAula] = useState('')
  const [planoAula, setPlanoAula] = useState('')
  const [salvandoAula, setSalvandoAula] = useState(false)

  useEffect(() => {
    if (!modalAula) return
    setResumoAula(registroDoDia?.resumo ?? '')
    setPlanoAula(registroDoDia?.planoId ?? planosAtivosNoDia[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalAula])

  async function salvarAulaDoDia() {
    if (!turmaId || !resumoAula.trim()) return
    setSalvandoAula(true)
    try {
      await definirRegistroAula(turmaId, data, resumoAula.trim(), planoAula || undefined)
      notificar('Aula deste dia registrada.')
      setModalAula(false)
    } catch {
      // erro já notificado pelo DataContext
    } finally {
      setSalvandoAula(false)
    }
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
            <h1>Presença</h1>
          </div>
        </header>
        <div className="vazio painel">
          <p>Cadastre turmas e alunos para registrar presença.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Presença</h1>
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
          <span>Dia da aula (dias programados desta turma)</span>
          <div className="navegador-dia">
            <button
              type="button"
              className="btn btn-fantasma btn-pequeno"
              onClick={() => setData((d) => passoDiaValido(d, -1, diasAulaAtual, feriadosSet))}
              aria-label="Dia de aula anterior"
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
              onClick={() => setData((d) => passoDiaValido(d, 1, diasAulaAtual, feriadosSet))}
              aria-label="Próximo dia de aula"
            >
              ›
            </button>
          </div>
        </label>
      </div>

      {turmasDoAno.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhuma turma cadastrada no ano letivo {anoAtivo}.</p>
        </div>
      ) : turmasDaEscola.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhuma turma nesta escola.</p>
        </div>
      ) : alunosTurma.length === 0 ? (
        <div className="vazio painel">
          <p>Esta turma ainda não tem alunos.</p>
        </div>
      ) : (
        <div className="grid-frequencia">
          <section className="painel">
            <div className="frequencia-dia-head">
              <h2>
                {nomeDiaSemana(data)}, {formatarData(data)}
              </h2>
              <div className="grupo-botoes">
                <button
                  type="button"
                  className={`btn btn-pequeno ${registroDoDia ? 'btn-primario' : 'btn-fantasma'}`}
                  onClick={() => setModalAula(true)}
                >
                  {registroDoDia ? '✎ Aula deste dia' : 'Aula deste dia'}
                </button>
                {!somenteLeitura && (
                  <button
                    type="button"
                    className={`btn btn-pequeno ${semAulaHoje ? 'btn-primario' : 'btn-fantasma'}`}
                    onClick={onSemAula}
                  >
                    {semAulaHoje ? '✕ Sem aula neste dia' : 'Não houve aula neste dia'}
                  </button>
                )}
              </div>
            </div>

            {feriadoHoje && (
              <p className="aviso-somente-leitura" style={{ textAlign: 'left' }}>
                📅 {feriadoHoje.titulo} — feriado/dia sem aula pra escola inteira.
              </p>
            )}

            {semAulaHoje && (
              <p className="texto-suave">
                Este dia está marcado como sem aula — não conta na presença de
                ninguém. Clique de novo no botão acima para desfazer.
              </p>
            )}

            {registroDoDia && (
              <p className="texto-suave frequencia-aula-resumo">
                <strong>O que foi aplicado:</strong> {resumoTexto(registroDoDia.resumo)}
              </p>
            )}

            <table className="tabela">
              <tbody>
                {alunosTurma.map((aluno) => {
                  const v = dataAulaHoje
                    ? frequencia[chavePresenca(aluno.id, dataAulaHoje.id)]
                    : undefined
                  const rotulo = semAulaHoje
                    ? '—'
                    : v === true
                      ? 'Presente'
                      : v === false
                        ? 'Falta'
                        : '—'
                  const classe =
                    !semAulaHoje && v === true
                      ? 'pill-aprovado'
                      : !semAulaHoje && v === false
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
                          disabled={semAulaHoje || somenteLeitura}
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
        </div>
      )}

      <Modal
        aberto={modalAula}
        titulo="Aula deste dia"
        onFechar={() => setModalAula(false)}
        rodape={
          <>
            <button className="btn btn-fantasma" onClick={() => setModalAula(false)}>
              Cancelar
            </button>
            {!somenteLeitura && (
              <button
                className="btn btn-primario"
                onClick={salvarAulaDoDia}
                disabled={salvandoAula || !resumoAula.trim()}
              >
                {salvandoAula ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </>
        }
      >
        <div className="form-grid">
          <p className="texto-suave campo-largo">
            {nomeDiaSemana(data)}, {formatarData(data)} — {turmaAtual?.nome}
          </p>
          {planosAtivosNoDia.length > 1 && (
            <label className="campo campo-largo">
              <span>Plano de aula</span>
              <select
                className="select"
                value={planoAula}
                onChange={(e) => setPlanoAula(e.target.value)}
                disabled={somenteLeitura}
              >
                <option value="">— Sem plano vinculado —</option>
                {planosAtivosNoDia.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titulo}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="campo campo-largo">
            <span>O que foi aplicado</span>
            <EditorRico
              value={resumoAula}
              onChange={setResumoAula}
              placeholder="Resumo do conteúdo dado nesta aula..."
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

