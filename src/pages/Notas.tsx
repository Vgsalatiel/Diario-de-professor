import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useAnoLetivo } from '../context/AnoLetivoContext'
import type { ModeloCalculo, Periodo, SistemaPeriodo, TipoAvaliacao } from '../types'
import { OPCOES_CONCEITO } from '../types'
import {
  calcularMedia,
  chaveNota,
  formatarNota,
  situacao,
} from '../lib/media'
import { opcoesPeriodo, rotuloSistema, turmaInicial } from '../lib/periodos'
import { exportarExcel, exportarHTML, exportarPDF } from '../lib/export'
import { Modal } from '../components/Modal'

// Cabeçalho curto pra coluna de avaliação — o nome completo pode ser bem
// longo ("A Proclamação da República e seus primeiros anos"), o que
// deixava a coluna gigante. Detecta prova/atividade pelo começo do nome;
// o que não bate com nenhum dos dois vira "Aval" genérico. O nome
// completo continua acessível pelo tooltip (title) do cabeçalho.
function rotuloCurtoAvaliacao(nome: string, indice: number): string {
  const numero = indice + 1
  const n = nome.trim().toLowerCase()
  if (n.startsWith('prova')) return `Prova${numero}`
  if (n.startsWith('ativ')) return `Ativ${numero}`
  return `Aval${numero}`
}

export function Notas() {
  const {
    turmas,
    alunos,
    avaliacoes,
    notas,
    conceitos,
    definirNota,
    definirConceito,
    configDaTurma,
    atualizarConfig,
    criarAvaliacao,
    removerAvaliacao,
  } = useData()
  const { notificar } = useToast()
  const { anoAtivo, somenteLeitura } = useAnoLetivo()

  const [escolaFiltro, setEscolaFiltro] = useState('todas')
  const [turmaId, setTurmaId] = useState<string>(() =>
    turmaInicial(turmas.filter((t) => t.anoLetivo === anoAtivo)),
  )
  const [periodo, setPeriodo] = useState<Periodo>('1')
  const [modalAval, setModalAval] = useState(false)
  const [novaAval, setNovaAval] = useState({ nome: '', peso: '1', periodo: '1' as Periodo })
  const [modalExportar, setModalExportar] = useState(false)
  const [exportPeriodo, setExportPeriodo] = useState<'atual' | 'todos'>('atual')
  const [exportAlunoId, setExportAlunoId] = useState('todos')

  // As turmas chegam da API de forma assíncrona — se a página monta antes
  // da primeira turma carregar, escolhe a turma inicial assim que chegar.
  useEffect(() => {
    if (!turmaId && turmas.length > 0) {
      setTurmaId(turmaInicial(turmas.filter((t) => t.anoLetivo === anoAtivo)))
    }
  }, [turmas, turmaId, anoAtivo])

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

  const config = turmaId ? configDaTurma(turmaId) : null
  const ehConceito = config?.tipoAvaliacao === 'conceito'
  const alunosTurma = useMemo(
    () =>
      alunos
        .filter((a) => a.turmaId === turmaId)
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    [alunos, turmaId],
  )
  const avalsTurma = useMemo(
    () =>
      avaliacoes.filter((a) => a.turmaId === turmaId && a.periodo === periodoAtivo),
    [avaliacoes, turmaId, periodoAtivo],
  )

  function onNota(alunoId: string, avaliacaoId: string, texto: string) {
    if (texto.trim() === '') {
      definirNota(alunoId, avaliacaoId, null)
      return
    }
    const valor = Number(texto.replace(',', '.'))
    if (Number.isNaN(valor)) return
    const limitado = Math.max(0, Math.min(10, valor))
    definirNota(alunoId, avaliacaoId, limitado)
  }

  function onNotaSalva(texto: string) {
    if (texto.trim() !== '') notificar('Nota salva.')
  }

  function abrirModalAval() {
    setNovaAval({ nome: '', peso: '1', periodo: periodoAtivo })
    setModalAval(true)
  }

  function addAvaliacao() {
    if (!novaAval.nome.trim() || !turmaId) return
    criarAvaliacao({
      turmaId,
      nome: novaAval.nome.trim(),
      peso: Number(novaAval.peso) || 1,
      periodo: novaAval.periodo,
    })
    notificar('Avaliação adicionada.')
    setModalAval(false)
  }

  function abrirModalExportar() {
    setExportPeriodo('atual')
    setExportAlunoId('todos')
    setModalExportar(true)
  }

  function exportar(formato: 'excel' | 'html' | 'pdf') {
    if (!turmaId || !config) return
    const turma = turmas.find((t) => t.id === turmaId)!

    const alunosParaExportar =
      exportAlunoId === 'todos' ? alunosTurma : alunosTurma.filter((a) => a.id === exportAlunoId)
    const periodosParaExportar =
      exportPeriodo === 'todos'
        ? periodosDisponiveis
        : periodosDisponiveis.filter((p) => p.valor === periodoAtivo)

    const secoes = periodosParaExportar.map((p) => ({
      rotulo: p.rotulo,
      avaliacoes: avaliacoes.filter((a) => a.turmaId === turmaId && a.periodo === p.valor),
    }))

    const dados = { turma, alunos: alunosParaExportar, secoes, notas, config }
    if (formato === 'excel') exportarExcel(dados)
    else if (formato === 'html') exportarHTML(dados)
    else exportarPDF(dados)
    setModalExportar(false)
  }

  if (turmas.length === 0) {
    return (
      <div className="stack-lg">
        <header className="pagina-head">
          <div>
            <h1>Notas</h1>
          </div>
        </header>
        <div className="vazio painel">
          <p>Cadastre turmas e alunos para lançar notas.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Notas</h1>
          <p className="pagina-sub">
            As médias são calculadas automaticamente conforme o modelo da turma.
          </p>
        </div>
        <div className="grupo-botoes">
          <button className="btn btn-fantasma" onClick={abrirModalExportar}>
            Exportar
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

        {config && (
          <>
            <label className="campo-inline">
              <span>Tipo de avaliação</span>
              <select
                className="select"
                value={config.tipoAvaliacao}
                disabled={somenteLeitura}
                onChange={(e) =>
                  atualizarConfig(turmaId, {
                    tipoAvaliacao: e.target.value as TipoAvaliacao,
                  })
                }
              >
                <option value="nota">Nota (0 a 10)</option>
                <option value="conceito">Conceito</option>
              </select>
            </label>

            {config.tipoAvaliacao === 'nota' && (
              <>
                <label className="campo-inline">
                  <span>Cálculo da média</span>
                  <select
                    className="select"
                    value={config.modelo}
                    disabled={somenteLeitura}
                    onChange={(e) =>
                      atualizarConfig(turmaId, {
                        modelo: e.target.value as ModeloCalculo,
                      })
                    }
                  >
                    <option value="simples">Média simples</option>
                    <option value="ponderada">Média ponderada (por peso)</option>
                  </select>
                </label>

                <label className="campo-inline campo-estreito">
                  <span>Média p/ aprovação</span>
                  <input
                    className="input-num"
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={config.mediaAprovacao}
                    disabled={somenteLeitura}
                    onChange={(e) =>
                      atualizarConfig(turmaId, {
                        mediaAprovacao: Number(e.target.value) || 0,
                      })
                    }
                  />
                </label>
              </>
            )}

            {!somenteLeitura && (
              <button className="btn btn-fantasma" onClick={abrirModalAval}>
                + Avaliação
              </button>
            )}
          </>
        )}
      </div>

      {turmasDoAno.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhuma turma cadastrada no ano letivo {anoAtivo}.</p>
          {!somenteLeitura && (
            <Link to="/turmas" className="btn btn-primario">
              Ir para Turmas
            </Link>
          )}
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
        <div className="painel sem-padding rolagem-x">
          <table className="tabela tabela-notas tabela-responsiva">
            <thead>
              <tr>
                <th className="col-aluno">Aluno</th>
                {avalsTurma.map((av, indice) => (
                  <th key={av.id} className="col-nota">
                    <span className="th-aval" title={av.nome}>
                      {rotuloCurtoAvaliacao(av.nome, indice)}
                      {config?.modelo === 'ponderada' && (
                        <em className="peso">peso {av.peso}</em>
                      )}
                    </span>
                    {!somenteLeitura && (
                      <button
                        className="remover-col"
                        title="Remover avaliação"
                        onClick={() => {
                          if (confirm(`Remover a avaliação "${av.nome}"?`))
                            removerAvaliacao(av.id)
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </th>
                ))}
                {!ehConceito && (
                  <>
                    <th className="col-media">Média</th>
                    <th className="col-situacao">Situação</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {alunosTurma.map((aluno) => {
                const media = config && !ehConceito
                  ? calcularMedia(aluno.id, avalsTurma, notas, config.modelo)
                  : null
                const sit = situacao(media, config?.mediaAprovacao ?? 6)
                return (
                  <tr key={aluno.id}>
                    <td className="celula-nome col-aluno">{aluno.nome}</td>
                    {avalsTurma.map((av, indice) => {
                      const rotuloCol = rotuloCurtoAvaliacao(av.nome, indice)
                      if (ehConceito) {
                        const c = conceitos[chaveNota(aluno.id, av.id)]
                        return (
                          <td key={av.id} className="col-nota" data-label={rotuloCol}>
                            <select
                              className="select select-conceito"
                              value={c ?? ''}
                              onChange={(e) =>
                                definirConceito(aluno.id, av.id, e.target.value || null)
                              }
                              disabled={somenteLeitura}
                            >
                              <option value="">—</option>
                              {OPCOES_CONCEITO.map((op) => (
                                <option key={op} value={op}>
                                  {op}
                                </option>
                              ))}
                            </select>
                          </td>
                        )
                      }
                      const v = notas[chaveNota(aluno.id, av.id)]
                      return (
                        <td key={av.id} className="col-nota" data-label={rotuloCol}>
                          <input
                            className="input-nota"
                            inputMode="decimal"
                            value={v == null ? '' : String(v).replace('.', ',')}
                            onChange={(e) => onNota(aluno.id, av.id, e.target.value)}
                            onBlur={(e) => onNotaSalva(e.target.value)}
                            placeholder="—"
                            disabled={somenteLeitura}
                          />
                        </td>
                      )
                    })}
                    {!ehConceito && (
                      <>
                        <td className="col-media celula-media" data-label="Média">
                          {formatarNota(media)}
                        </td>
                        <td className="col-situacao" data-label="Situação">
                          <span className={`pill pill-${sit}`}>
                            {sit === 'aprovado'
                              ? 'Aprovado'
                              : sit === 'recuperacao'
                                ? 'Recuperação'
                                : '—'}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {avalsTurma.length === 0 && (
            <div className="aviso-tabela">
              Nenhuma avaliação neste {rotuloSistema(sistemaAtual).toLowerCase()}. Use
              “+ Avaliação” para adicionar colunas de nota.
            </div>
          )}
        </div>
      )}

      <Modal
        aberto={modalAval}
        titulo="Nova avaliação"
        onFechar={() => setModalAval(false)}
        rodape={
          <>
            <button className="btn btn-fantasma" onClick={() => setModalAval(false)}>
              Cancelar
            </button>
            <button className="btn btn-primario" onClick={addAvaliacao}>
              Adicionar
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label className="campo campo-largo">
            <span>Nome da avaliação</span>
            <input
              value={novaAval.nome}
              onChange={(e) => setNovaAval({ ...novaAval, nome: e.target.value })}
              placeholder="Ex.: Prova 1, Trabalho, Recuperação"
              autoFocus
            />
          </label>
          <label className="campo">
            <span>Peso</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={novaAval.peso}
              onChange={(e) => setNovaAval({ ...novaAval, peso: e.target.value })}
            />
          </label>
          <label className="campo">
            <span>{rotuloSistema(sistemaAtual)}</span>
            <select
              className="select"
              value={novaAval.periodo}
              onChange={(e) =>
                setNovaAval({ ...novaAval, periodo: e.target.value as Periodo })
              }
            >
              {periodosDisponiveis.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </label>
          <p className="texto-suave campo-largo">
            O peso só afeta o resultado quando o cálculo da turma está em “média
            ponderada”.
          </p>
        </div>
      </Modal>

      <Modal
        aberto={modalExportar}
        titulo="Exportar notas"
        onFechar={() => setModalExportar(false)}
        rodape={
          <>
            <button className="btn btn-fantasma" onClick={() => exportar('excel')}>
              Excel
            </button>
            <button className="btn btn-fantasma" onClick={() => exportar('html')}>
              HTML
            </button>
            <button className="btn btn-primario" onClick={() => exportar('pdf')}>
              PDF
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label className="campo">
            <span>{rotuloSistema(sistemaAtual)}</span>
            <select
              className="select"
              value={exportPeriodo}
              onChange={(e) => setExportPeriodo(e.target.value as 'atual' | 'todos')}
            >
              <option value="atual">
                Só o {periodosDisponiveis.find((p) => p.valor === periodoAtivo)?.rotulo ?? 'atual'}
              </option>
              <option value="todos">Todos os {rotuloSistema(sistemaAtual).toLowerCase()}s</option>
            </select>
          </label>
          <label className="campo">
            <span>Aluno</span>
            <select
              className="select"
              value={exportAlunoId}
              onChange={(e) => setExportAlunoId(e.target.value)}
            >
              <option value="todos">Todos os alunos</option>
              {alunosTurma.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Modal>
    </div>
  )
}
