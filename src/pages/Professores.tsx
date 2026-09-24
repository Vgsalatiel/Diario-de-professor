import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, ApiError } from '../lib/api'
import { ProfessorDetalheDrawer } from '../components/ProfessorDetalheDrawer'
import type { ProfessorResumo, ResumoProfessoresEscola, SituacaoRegistro } from '../types'

const SELO_SITUACAO_REGISTRO: Record<SituacaoRegistro, string> = {
  boa: '🟢',
  atencao: '🟡',
  critica: '🔴',
  semDados: '—',
}

// Visão da escola inteira sobre os professores — o(a) diretor(a)
// acompanha e administra (ver quem está em dia, excluir conta), não edita
// o trabalho pedagógico. Isso continua exclusivo da Coordenação.
export function Professores() {
  const { professora } = useAuth()
  const { notificar } = useToast()

  const [professores, setProfessores] = useState<ProfessorResumo[]>([])
  const [resumo, setResumo] = useState<ResumoProfessoresEscola | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [professorSelecionadoId, setProfessorSelecionadoId] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    setErro('')
    Promise.all([
      api.get<ProfessorResumo[]>('/admin/professores'),
      api.get<ResumoProfessoresEscola>('/admin/professores/resumo'),
    ])
      .then(([p, r]) => {
        setProfessores(p)
        setResumo(r)
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  async function excluir(p: ProfessorResumo) {
    const aviso =
      p.totalTurmas > 0
        ? `Excluir "${p.nome}"? Isso remove a atribuição dele de ${p.totalTurmas} turma(s). Essa ação não pode ser desfeita.`
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
          <h1>Professores</h1>
          <p className="pagina-sub">Visão da escola inteira — quem está em dia com o registro das aulas.</p>
        </div>
      </header>

      {erro && <div className="alerta-erro">{erro}</div>}

      {carregando ? (
        <p className="texto-suave">Carregando…</p>
      ) : (
        <div className="stack-md">
          {resumo && (
            <div className="cards-numero cards-numero-4">
              <div className="card-numero">
                <span className="card-numero-valor">{resumo.total}</span>
                <span className="card-numero-rotulo">Professores</span>
              </div>
              <div className="card-numero">
                <span className="card-numero-valor">🟢 {resumo.emDia}</span>
                <span className="card-numero-rotulo">Registros em dia</span>
              </div>
              <div className={`card-numero ${resumo.pendentes > 0 ? 'destaque' : ''}`}>
                <span className="card-numero-valor">🟡 {resumo.pendentes}</span>
                <span className="card-numero-rotulo">Registros pendentes</span>
              </div>
              <div className={`card-numero ${resumo.comProblemas > 0 ? 'destaque' : ''}`}>
                <span className="card-numero-valor">🔴 {resumo.comProblemas}</span>
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

      <ProfessorDetalheDrawer
        professorId={professorSelecionadoId}
        onFechar={() => setProfessorSelecionadoId(null)}
      />
    </div>
  )
}
