import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { useAnoLetivo } from '../context/AnoLetivoContext'
import { formatarData } from '../lib/eventos'
import { rotuloTipo, corTipo } from '../lib/eventos'
import { chavePresenca } from '../lib/frequencia'
import { chaveEntrega } from '../lib/entregas'
import { nomeDiaSemana } from '../lib/diasUteis'
import { turmaInicial } from '../lib/periodos'
import { hojeISO } from '../lib/data'
import { resumoTexto } from '../lib/texto'
import type { Evento, StatusEntrega } from '../types'

const ROTULO_STATUS: Record<StatusEntrega, string> = {
  feito: 'Feito',
  pendente: 'Pendente',
  naoEntregou: 'Não entregou',
}

interface ItemHistorico {
  data: string
  resumoAula?: string
  frequencia?: { presentes: number; faltas: number; total: number }
  eventos: Evento[]
}

export function Historico() {
  const { turmas, alunos, datasAula, frequencia, registrosAula, eventos, entregas, definirEntrega } =
    useData()
  const { anoAtivo } = useAnoLetivo()

  const [escolaFiltro, setEscolaFiltro] = useState('todas')
  const [turmaId, setTurmaId] = useState<string>(() =>
    turmaInicial(turmas.filter((t) => t.anoLetivo === anoAtivo)),
  )

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

  const escolaAtiva = escolas.length > 1 && escolaFiltro === 'todas' ? escolas[0] : escolaFiltro

  const turmasDaEscola = useMemo(
    () =>
      escolaAtiva === 'todas' ? turmasDoAno : turmasDoAno.filter((t) => t.escola === escolaAtiva),
    [turmasDoAno, escolaAtiva],
  )

  function trocarEscola(e: string) {
    setEscolaFiltro(e)
    const disponivel = turmasDoAno.find((t) => t.escola === e)
    setTurmaId(disponivel?.id ?? '')
  }

  const turmaAtual = turmas.find((t) => t.id === turmaId) ?? null

  // Junta registro de aula + frequência lançada + provas/atividades numa
  // única linha do tempo por turma — tudo que já existe em telas
  // separadas (Plano de aula, Presença, Agenda), sem precisar de nenhum
  // dado novo no banco.
  const timeline = useMemo(() => {
    if (!turmaId) return []
    const hoje = hojeISO()
    const mapa = new Map<string, ItemHistorico>()

    function item(data: string): ItemHistorico {
      const existente = mapa.get(data)
      if (existente) return existente
      const novo: ItemHistorico = { data, eventos: [] }
      mapa.set(data, novo)
      return novo
    }

    for (const r of registrosAula) {
      if (r.turmaId !== turmaId || r.data > hoje) continue
      item(r.data).resumoAula = r.resumo
    }

    const alunosDaTurma = alunos.filter((a) => a.turmaId === turmaId)
    for (const d of datasAula) {
      if (d.turmaId !== turmaId || d.semAula || d.data > hoje) continue
      let presentes = 0
      let faltas = 0
      for (const aluno of alunosDaTurma) {
        const v = frequencia[chavePresenca(aluno.id, d.id)]
        if (v === true) presentes++
        else if (v === false) faltas++
      }
      if (presentes + faltas > 0) {
        item(d.data).frequencia = { presentes, faltas, total: presentes + faltas }
      }
    }

    for (const e of eventos) {
      if (e.turmaId !== turmaId || e.data > hoje) continue
      if (e.tipo !== 'prova' && e.tipo !== 'trabalho') continue
      // Só entra no histórico quando o professor já marcou o evento como
      // concluído (na Agenda) — uma prova/atividade agendada mas não dada
      // ainda não é "histórico".
      if (!e.concluido) continue
      item(e.data).eventos.push(e)
    }

    return Array.from(mapa.values()).sort((a, b) => b.data.localeCompare(a.data))
  }, [turmaId, registrosAula, datasAula, alunos, frequencia, eventos])

  const alunosDaTurma = useMemo(
    () =>
      alunos
        .filter((a) => a.turmaId === turmaId && a.situacao === 'ativo')
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    [alunos, turmaId],
  )

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Histórico</h1>
          <p className="pagina-sub">
            O que já foi dado, a frequência lançada e as avaliações de cada dia, numa linha do
            tempo por turma.
          </p>
        </div>
      </header>

      {escolas.length > 1 && (
        <div className="abas">
          <button
            className={`aba ${escolaFiltro === 'todas' ? 'ativa' : ''}`}
            onClick={() => trocarEscola('todas')}
          >
            Todas as escolas
          </button>
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

      {turmasDoAno.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhuma turma cadastrada no ano letivo {anoAtivo}.</p>
        </div>
      ) : turmasDaEscola.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhuma turma nesta escola.</p>
        </div>
      ) : (
        <>
          <div className="barra-config">
            <label className="campo-inline">
              <span>Turma</span>
              <select className="select" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                {turmasDaEscola.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {timeline.length === 0 ? (
            <div className="vazio painel">
              <p>Ainda não há nada registrado pra {turmaAtual?.nome ?? 'esta turma'}.</p>
            </div>
          ) : (
            <div className="timeline">
              {timeline.map((item) => (
                <article key={item.data} className="evento-cartao plano-cartao-linha">
                  <div className="evento-cartao-barra" style={{ background: turmaAtual?.cor }} />
                  <div className="evento-cartao-data">
                    <span className="dia">{item.data.split('-')[2]}</span>
                    <span className="mes">
                      {new Intl.DateTimeFormat('pt-BR', { month: 'short' })
                        .format(new Date(item.data + 'T00:00:00'))
                        .replace('.', '')}
                    </span>
                  </div>
                  <div className="evento-cartao-corpo">
                    <div className="evento-cartao-topo">
                      <span className="texto-suave">{nomeDiaSemana(item.data)}</span>
                    </div>
                    <h3>{formatarData(item.data)}</h3>

                    {item.resumoAula && (
                      <p className="evento-conteudo">
                        <strong>Aula:</strong> {resumoTexto(item.resumoAula)}
                      </p>
                    )}

                    {item.frequencia && (
                      <p className="texto-suave">
                        Frequência: {item.frequencia.presentes} presente(s), {item.frequencia.faltas}{' '}
                        falta(s) de {item.frequencia.total} lançado(s).
                      </p>
                    )}

                    {item.eventos.length > 0 && (
                      <div className="stack-sm entregas-do-dia">
                        {item.eventos.map((e) => {
                          const feitos = alunosDaTurma.filter(
                            (a) => entregas[chaveEntrega(a.id, e.id)] === 'feito',
                          ).length
                          return (
                            <details key={e.id} className="entrega-detalhe">
                              <summary>
                                <span
                                  className="evento-tag"
                                  style={{ background: corTipo(e.tipo) }}
                                >
                                  {rotuloTipo(e.tipo)}: {e.titulo}
                                </span>
                                <span className="texto-suave">
                                  {feitos}/{alunosDaTurma.length} entregaram
                                </span>
                              </summary>
                              {alunosDaTurma.length === 0 ? (
                                <p className="texto-suave">Nenhum aluno ativo nesta turma.</p>
                              ) : (
                                <ul className="lista-entregas">
                                  {alunosDaTurma.map((aluno) => {
                                    const status =
                                      entregas[chaveEntrega(aluno.id, e.id)] ?? 'pendente'
                                    return (
                                      <li key={aluno.id} className="linha-entrega">
                                        <span>{aluno.nome}</span>
                                        <div className="grupo-status-entrega">
                                          {(['feito', 'pendente', 'naoEntregou'] as StatusEntrega[]).map(
                                            (opcao) => (
                                              <button
                                                key={opcao}
                                                type="button"
                                                className={`status-entrega-btn status-${opcao} ${status === opcao ? 'ativo' : ''}`}
                                                onClick={() => definirEntrega(aluno.id, e.id, opcao)}
                                              >
                                                {ROTULO_STATUS[opcao]}
                                              </button>
                                            ),
                                          )}
                                        </div>
                                      </li>
                                    )
                                  })}
                                </ul>
                              )}
                            </details>
                          )
                        })}
                      </div>
                    )}

                    {!item.resumoAula && !item.frequencia && item.eventos.length === 0 && (
                      <p className="texto-suave">Nenhum detalhe registrado neste dia.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
