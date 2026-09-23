import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { pillFrequencia } from '../pages/Admin'
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
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [searchParams, setSearchParams] = useSearchParams()
  const [turmaFiltroId, setTurmaFiltroId] = useState<string | null>(null)

  // Veio de "Ver alunos" numa turma específica — filtra só nela, sem
  // precisar digitar o nome de cada um pra achar.
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

  const turmaFiltroNome = turmaFiltroId
    ? alunos.find((a) => a.turmaId === turmaFiltroId)?.turmaNome ?? null
    : null

  const alunosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return alunos.filter((a) => {
      if (turmaFiltroId && a.turmaId !== turmaFiltroId) return false
      if (termo && !a.nome.toLowerCase().includes(termo)) return false
      return true
    })
  }, [alunos, busca, turmaFiltroId])

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

      {turmaFiltroId && (
        <div className="alerta-info">
          Mostrando só os alunos de <strong>{turmaFiltroNome ?? 'turma selecionada'}</strong>.{' '}
          <button className="link-botao" onClick={() => setTurmaFiltroId(null)}>
            Ver todos os alunos
          </button>
        </div>
      )}

      <input
        style={{ maxWidth: 360 }}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Pesquisar aluno pelo nome..."
      />

      {alunos.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhum aluno cadastrado ainda.</p>
        </div>
      ) : alunosFiltrados.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhum aluno encontrado{busca ? ` para "${busca}"` : ''}.</p>
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
                <th>Situação</th>
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
                  <td>{a.situacao}</td>
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
