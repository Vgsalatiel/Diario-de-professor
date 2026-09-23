import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, ApiError } from '../lib/api'
import { AlunosEscolaPainel } from '../components/AlunosEscolaPainel'
import { ProfessorDetalheDrawer } from '../components/ProfessorDetalheDrawer'
import type { ProfessorResumo, ResumoProfessoresEscola, SituacaoRegistro, TurmaResumoAdmin } from '../types'

type Aba = 'professores' | 'turmas' | 'alunos'

export function pillFrequencia(percentual: number | null) {
  if (percentual == null) return <span className="pill pill-sem-nota">—</span>
  return (
    <span className={`pill ${percentual >= 75 ? 'pill-aprovado' : 'pill-recuperacao'}`}>{percentual}%</span>
  )
}

const SELO_SITUACAO_REGISTRO: Record<SituacaoRegistro, string> = {
  boa: '🟢',
  atencao: '🟡',
  critica: '🔴',
  semDados: '—',
}

export function Admin() {
  const { professora } = useAuth()
  const { notificar } = useToast()
  const [params, setParams] = useSearchParams()
  const aba = (params.get('aba') as Aba) || 'professores'

  const [professores, setProfessores] = useState<ProfessorResumo[]>([])
  const [resumoProfessores, setResumoProfessores] = useState<ResumoProfessoresEscola | null>(null)
  const [turmas, setTurmas] = useState<TurmaResumoAdmin[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [professorSelecionadoId, setProfessorSelecionadoId] = useState<string | null>(null)

  function trocarAba(nova: Aba) {
    setParams(nova === 'professores' ? {} : { aba: nova })
  }

  function carregar() {
    setCarregando(true)
    setErro('')
    Promise.all([
      api.get<ProfessorResumo[]>('/admin/professores'),
      api.get<TurmaResumoAdmin[]>('/admin/turmas'),
      api.get<ResumoProfessoresEscola>('/admin/professores/resumo'),
    ])
      .then(([p, t, resumo]) => {
        setProfessores(p)
        setResumoProfessores(resumo)
        // Turma com pendência primeiro — é o que quem clicou no link de
        // "Pendências" do início veio procurar.
        setTurmas(
          [...t].sort((x, y) => {
            const pendX = x.semRegistroOntem || x.avaliacaoPendente ? 1 : 0
            const pendY = y.semRegistroOntem || y.avaliacaoPendente ? 1 : 0
            return pendY - pendX
          }),
        )
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  async function excluir(p: ProfessorResumo) {
    const aviso =
      p.totalTurmas > 0
        ? `Excluir "${p.nome}"? Isso apaga também ${p.totalTurmas} turma(s) e tudo dentro delas (alunos, notas, frequência, planos de aula...). Essa ação não pode ser desfeita.`
        : `Excluir "${p.nome}"? Essa ação não pode ser desfeita.`
    if (!confirm(aviso)) return

    setExcluindoId(p.id)
    try {
      await api.delete(`/admin/professores/${p.id}`)
      setProfessores((ps) => ps.filter((x) => x.id !== p.id))
      notificar('Professor excluído.')
    } catch (e) {
      notificar(e instanceof ApiError ? e.message : 'Não foi possível excluir.')
    } finally {
      setExcluindoId(null)
    }
  }

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Administração</h1>
          <p className="pagina-sub">Visão da escola inteira — professores, turmas e alunos.</p>
        </div>
      </header>

      <div className="abas">
        <button className={`aba ${aba === 'professores' ? 'ativa' : ''}`} onClick={() => trocarAba('professores')}>
          Professores {professores.length > 0 && `(${professores.length})`}
        </button>
        <button className={`aba ${aba === 'turmas' ? 'ativa' : ''}`} onClick={() => trocarAba('turmas')}>
          Turmas {turmas.length > 0 && `(${turmas.length})`}
        </button>
        <button className={`aba ${aba === 'alunos' ? 'ativa' : ''}`} onClick={() => trocarAba('alunos')}>
          Alunos
        </button>
      </div>

      {erro && <div className="alerta-erro">{erro}</div>}

      {carregando ? (
        <p className="texto-suave">Carregando…</p>
      ) : (
        <>
          {aba === 'professores' && (
            <div className="stack-md">
              {resumoProfessores && (
                <div className="cards-numero cards-numero-4">
                  <div className="card-numero">
                    <span className="card-numero-valor">{resumoProfessores.total}</span>
                    <span className="card-numero-rotulo">Professores</span>
                  </div>
                  <div className="card-numero">
                    <span className="card-numero-valor">🟢 {resumoProfessores.emDia}</span>
                    <span className="card-numero-rotulo">Registros em dia</span>
                  </div>
                  <div className={`card-numero ${resumoProfessores.pendentes > 0 ? 'destaque' : ''}`}>
                    <span className="card-numero-valor">🟡 {resumoProfessores.pendentes}</span>
                    <span className="card-numero-rotulo">Registros pendentes</span>
                  </div>
                  <div className={`card-numero ${resumoProfessores.comProblemas > 0 ? 'destaque' : ''}`}>
                    <span className="card-numero-valor">🔴 {resumoProfessores.comProblemas}</span>
                    <span className="card-numero-rotulo">Com problemas</span>
                  </div>
                </div>
              )}

              {professores.length === 0 ? (
                <div className="vazio painel">
                  <p>Nenhum professor cadastrado ainda.</p>
                </div>
              ) : (
                <div className="painel sem-padding rolagem-x">
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Matéria(s)</th>
                        <th>Turmas</th>
                        <th>Registro</th>
                        <th>Pendências</th>
                        <th>Cadastrado em</th>
                        <th className="col-acoes">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {professores.map((p) => (
                        <tr key={p.id}>
                          <td className="celula-nome">
                            <button className="link-botao" onClick={() => setProfessorSelecionadoId(p.id)}>
                              {p.nome}
                            </button>
                            {p.isAdmin && <span className="badge-turma badge-diretor">diretor(a)</span>}
                          </td>
                          <td>{p.email}</td>
                          <td>{p.materias.join(', ')}</td>
                          <td>{p.totalTurmas}</td>
                          <td>{SELO_SITUACAO_REGISTRO[p.situacaoRegistro]}</td>
                          <td>
                            {p.pendencias > 0 ? (
                              <span className="pill pill-recuperacao">{p.pendencias}</span>
                            ) : (
                              <span className="pill pill-aprovado">0</span>
                            )}
                          </td>
                          <td>{new Date(p.criadoEm).toLocaleDateString('pt-BR')}</td>
                          <td className="col-acoes">
                            {p.id !== professora.id && (
                              <button
                                className="btn btn-perigo-fantasma btn-pequeno"
                                onClick={() => excluir(p)}
                                disabled={excluindoId === p.id}
                              >
                                {excluindoId === p.id ? 'Excluindo...' : 'Excluir'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {aba === 'turmas' &&
            (turmas.length === 0 ? (
              <div className="vazio painel">
                <p>Nenhuma turma cadastrada ainda.</p>
              </div>
            ) : (
              <div className="painel sem-padding rolagem-x">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Turma</th>
                      <th>Escola</th>
                      <th>Professor(a)</th>
                      <th>Alunos</th>
                      <th>Frequência média</th>
                      <th>Pendências</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turmas.map((t) => (
                      <tr key={t.id}>
                        <td className="celula-nome">{t.nome}</td>
                        <td>{t.escola}</td>
                        <td>
                          {t.professores.length === 0 ? (
                            <span className="texto-suave">—</span>
                          ) : (
                            <span className="stack-xs">
                              {t.professores.map((p) => (
                                <span key={p.professorId} className="pill pill-sem-nota">
                                  {p.professorNome} · {p.disciplina}
                                </span>
                              ))}
                            </span>
                          )}
                        </td>
                        <td>{t.totalAlunos}</td>
                        <td>{pillFrequencia(t.frequenciaMedia)}</td>
                        <td>
                          {!t.semRegistroOntem && !t.avaliacaoPendente ? (
                            <span className="texto-suave">—</span>
                          ) : (
                            <span className="stack-xs">
                              {t.semRegistroOntem && (
                                <span className="pill pill-recuperacao">Sem registro ontem</span>
                              )}
                              {t.avaliacaoPendente && (
                                <span className="pill pill-recuperacao">Avaliação sem nota</span>
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {aba === 'alunos' && <AlunosEscolaPainel />}
        </>
      )}

      <ProfessorDetalheDrawer
        professorId={professorSelecionadoId}
        onFechar={() => setProfessorSelecionadoId(null)}
      />
    </div>
  )
}
