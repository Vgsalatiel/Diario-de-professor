import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { pillFrequencia } from '../lib/pills'
import { AlunoDetalheDrawer } from './AlunoDetalheDrawer'
import type { AlunoResumoAdmin, ResumoAlunosEscola } from '../types'

// Visão da escola inteira sobre os alunos — o(a) diretor(a) não precisa
// ficar vendo nota por aluno, precisa enxergar rápido quantos existem,
// quantos exigem atenção (baixa frequência, em acompanhamento), e só
// pesquisar um aluno específico quando precisar. Reaproveitado tanto pela
// aba "Alunos" de Administração quanto pelo link "Alunos" do menu — pra
// quem só é diretor(a) (sem turma própria), é a mesma tela nos dois lugares.
export function AlunosEscolaPainel() {
  const [alunos, setAlunos] = useState<AlunoResumoAdmin[]>([])
  const [resumo, setResumo] = useState<ResumoAlunosEscola | null>(null)
  const [busca, setBusca] = useState('')
  const [turmaFiltroId, setTurmaFiltroId] = useState('todas')
  const [professorFiltroId, setProfessorFiltroId] = useState('todos')
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [searchParams, setSearchParams] = useSearchParams()

  // Veio de "Ver alunos" numa turma específica — já abre com o filtro de
  // turma selecionado, sem precisar escolher de novo.
  useEffect(() => {
    const turmaParam = searchParams.get('turma')
    if (!turmaParam) return
    setTurmaFiltroId(turmaParam)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    Promise.all([
      api.get<AlunoResumoAdmin[]>('/admin/alunos'),
      api.get<ResumoAlunosEscola>('/admin/alunos/resumo'),
    ])
      .then(([a, r]) => {
        setAlunos(a)
        setResumo(r)
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar.'))
      .finally(() => setCarregando(false))
  }, [])

  const turmasDisponiveis = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const a of alunos) mapa.set(a.turmaId, a.turmaNome)
    return Array.from(mapa, ([id, nome]) => ({ id, nome })).sort((x, y) => x.nome.localeCompare(y.nome))
  }, [alunos])

  const professoresDisponiveis = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const a of alunos) {
      for (const p of a.professores) mapa.set(p.id, p.nome)
    }
    return Array.from(mapa, ([id, nome]) => ({ id, nome })).sort((x, y) => x.nome.localeCompare(y.nome))
  }, [alunos])

  const alunosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return alunos.filter((a) => {
      if (turmaFiltroId !== 'todas' && a.turmaId !== turmaFiltroId) return false
      if (professorFiltroId !== 'todos' && !a.professores.some((p) => p.id === professorFiltroId)) return false
      if (termo && !a.nome.toLowerCase().includes(termo)) return false
      return true
    })
  }, [alunos, busca, turmaFiltroId, professorFiltroId])

  if (carregando) return <p className="texto-suave">Carregando…</p>
  if (erro) return <div className="alerta-erro">{erro}</div>

  return (
    <div className="stack-md">
      {resumo && (
        <div className="cards-numero cards-numero-6">
          <div className="card-numero">
            <span className="card-numero-valor">{resumo.total}</span>
            <span className="card-numero-rotulo">Total</span>
          </div>
          <div className="card-numero">
            <span className="card-numero-valor">{resumo.ativos}</span>
            <span className="card-numero-rotulo">Ativos</span>
          </div>
          <div className="card-numero">
            <span className="card-numero-valor">{resumo.transferidos}</span>
            <span className="card-numero-rotulo">Transferidos</span>
          </div>
          <div className="card-numero">
            <span className="card-numero-valor">{resumo.inativos}</span>
            <span className="card-numero-rotulo">Inativos</span>
          </div>
          <div className={`card-numero ${resumo.baixaFrequencia > 0 ? 'destaque' : ''}`}>
            <span className="card-numero-valor">⚠️ {resumo.baixaFrequencia}</span>
            <span className="card-numero-rotulo">Baixa frequência</span>
          </div>
          <div className={`card-numero ${resumo.comAcompanhamento > 0 ? 'destaque' : ''}`}>
            <span className="card-numero-valor">⚠️ {resumo.comAcompanhamento}</span>
            <span className="card-numero-rotulo">Em acompanhamento</span>
          </div>
        </div>
      )}

      <div className="barra-filtros">
        <select
          className="select"
          aria-label="Turma"
          value={turmaFiltroId}
          onChange={(e) => setTurmaFiltroId(e.target.value)}
        >
          <option value="todas">Todas as turmas</option>
          {turmasDisponiveis.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        <select
          className="select"
          aria-label="Professor"
          value={professorFiltroId}
          onChange={(e) => setProfessorFiltroId(e.target.value)}
        >
          <option value="todos">Todos os professores</option>
          {professoresDisponiveis.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <input
          style={{ maxWidth: 280 }}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar aluno pelo nome..."
        />
      </div>

      {alunos.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhum aluno cadastrado ainda.</p>
        </div>
      ) : alunosFiltrados.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhum aluno encontrado com esses filtros.</p>
        </div>
      ) : (
        <div className="painel sem-padding rolagem-x">
          <table className="tabela">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Turma</th>
                <th>Escola</th>
                <th>Professor(a)</th>
                <th>Pais (telefone)</th>
                <th>Situação</th>
                <th>Média</th>
                <th>Frequência</th>
              </tr>
            </thead>
            <tbody>
              {alunosFiltrados.map((a) => (
                <tr key={a.id}>
                  <td className="celula-nome">
                    <button className="link-botao" onClick={() => setAlunoSelecionadoId(a.id)}>
                      {a.nome}
                    </button>
                  </td>
                  <td>{a.turmaNome}</td>
                  <td>{a.escola}</td>
                  <td>{a.professorNome}</td>
                  <td>{a.telefonePais || '—'}</td>
                  <td>{a.situacao}</td>
                  <td>{a.mediaGeral == null ? '—' : String(a.mediaGeral).replace('.', ',')}</td>
                  <td>{pillFrequencia(a.frequenciaPercentual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlunoDetalheDrawer alunoId={alunoSelecionadoId} onFechar={() => setAlunoSelecionadoId(null)} />
    </div>
  )
}
