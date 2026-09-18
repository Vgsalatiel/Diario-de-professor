import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, ApiError } from '../lib/api'
import type { ProfessorResumo } from '../types'

export function Admin() {
  const { professora } = useAuth()
  const { notificar } = useToast()

  const [professores, setProfessores] = useState<ProfessorResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    setErro('')
    api
      .get<ProfessorResumo[]>('/admin/professores')
      .then(setProfessores)
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
          <p className="pagina-sub">Professores cadastrados no sistema.</p>
        </div>
      </header>

      {erro && <div className="alerta-erro">{erro}</div>}

      {carregando ? (
        <p className="texto-suave">Carregando…</p>
      ) : professores.length === 0 ? (
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
                <th>Cadastrado em</th>
                <th className="col-acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              {professores.map((p) => (
                <tr key={p.id}>
                  <td className="celula-nome">
                    {p.nome}
                    {p.isAdmin && <span className="badge-turma"> diretor(a)</span>}
                  </td>
                  <td>{p.email}</td>
                  <td>{p.materias.join(', ')}</td>
                  <td>{p.totalTurmas}</td>
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
  )
}
