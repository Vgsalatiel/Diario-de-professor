import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Aluno } from '../types'
import { Modal } from '../components/Modal'

export function Alunos() {
  const { turmas, alunos, criarAluno, atualizarAluno, removerAluno } = useData()
  const { notificar } = useToast()
  const [escolaFiltro, setEscolaFiltro] = useState('todas')
  const [turmaFiltro, setTurmaFiltro] = useState<string>('todas')
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Aluno | null>(null)
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefonePais: '',
    escolaId: '',
    turmaId: turmas[0]?.id ?? '',
  })

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
    setTurmaFiltro('todas')
  }

  const turmasDaEscolaForm = useMemo(
    () => (form.escolaId ? turmas.filter((t) => t.escola === form.escolaId) : turmas),
    [turmas, form.escolaId],
  )

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return alunos
      .filter((a) => turmasDaEscola.some((t) => t.id === a.turmaId))
      .filter((a) => (turmaFiltro === 'todas' ? true : a.turmaId === turmaFiltro))
      .filter((a) => (termo ? a.nome.toLowerCase().includes(termo) : true))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [alunos, turmasDaEscola, turmaFiltro, busca])

  function abrirNovo() {
    if (turmasDaEscola.length === 0) return
    const turmaInicial =
      turmaFiltro !== 'todas' ? turmas.find((t) => t.id === turmaFiltro) : turmasDaEscola[0]
    setEditando(null)
    setForm({
      nome: '',
      email: '',
      telefonePais: '',
      escolaId: turmaInicial?.escola ?? '',
      turmaId: turmaInicial?.id ?? '',
    })
    setModal(true)
  }

  function abrirEdicao(a: Aluno) {
    const turmaAtual = turmas.find((t) => t.id === a.turmaId)
    setEditando(a)
    setForm({
      nome: a.nome,
      email: a.email ?? '',
      telefonePais: a.telefonePais ?? '',
      escolaId: turmaAtual?.escola ?? '',
      turmaId: a.turmaId,
    })
    setModal(true)
  }

  function trocarEscolaForm(escolaId: string) {
    const primeiraTurma = turmas.find((t) => t.escola === escolaId)
    setForm({ ...form, escolaId, turmaId: primeiraTurma?.id ?? '' })
  }

  function salvar() {
    if (!form.nome.trim() || !form.turmaId) return
    const dados = {
      nome: form.nome.trim(),
      email: form.email.trim() || undefined,
      telefonePais: form.telefonePais.trim() || undefined,
      turmaId: form.turmaId,
    }
    if (editando) {
      atualizarAluno(editando.id, dados)
      notificar('Aluno atualizado.')
    } else {
      criarAluno(dados)
      notificar('Aluno adicionado.')
    }
    setModal(false)
  }

  function excluir(a: Aluno) {
    if (confirm(`Excluir "${a.nome}"? As notas do aluno também serão removidas.`)) {
      removerAluno(a.id)
    }
  }

  const nomeTurma = (id: string) => turmas.find((t) => t.id === id)?.nome ?? '—'
  const corTurma = (id: string) => turmas.find((t) => t.id === id)?.cor ?? '#6b7280'

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Alunos</h1>
          <p className="pagina-sub">Cadastre e consulte seus alunos por turma.</p>
        </div>
        <button
          className="btn btn-primario"
          onClick={abrirNovo}
          disabled={turmasDaEscola.length === 0}
        >
          Novo aluno
        </button>
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

      {turmas.length === 0 ? (
        <div className="vazio painel">
          <p>Cadastre uma turma antes de adicionar alunos.</p>
        </div>
      ) : turmasDaEscola.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhuma turma nesta escola.</p>
        </div>
      ) : (
        <>
          <div className="barra-filtros">
            <select
              value={turmaFiltro}
              onChange={(e) => setTurmaFiltro(e.target.value)}
              className="select"
            >
              <option value="todas">Todas as turmas</option>
              {turmasDaEscola.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
            <input
              className="input-busca"
              placeholder="Buscar por nome…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="painel sem-padding">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Turma</th>
                  <th>E-mail</th>
                  <th>Telefone (pais)</th>
                  <th className="col-acoes">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="celula-vazia">
                      Nenhum aluno encontrado.
                    </td>
                  </tr>
                ) : (
                  lista.map((a) => (
                    <tr key={a.id}>
                      <td className="celula-nome">{a.nome}</td>
                      <td>
                        <span
                          className="badge-turma"
                          style={{
                            color: corTurma(a.turmaId),
                            borderColor: corTurma(a.turmaId),
                          }}
                        >
                          {nomeTurma(a.turmaId)}
                        </span>
                      </td>
                      <td className="texto-suave">{a.email || '—'}</td>
                      <td className="texto-suave">{a.telefonePais || '—'}</td>
                      <td className="col-acoes">
                        <button
                          className="btn btn-fantasma btn-pequeno"
                          onClick={() => abrirEdicao(a)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-perigo-fantasma btn-pequeno"
                          onClick={() => excluir(a)}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        aberto={modal}
        titulo={editando ? 'Editar aluno' : 'Novo aluno'}
        onFechar={() => setModal(false)}
        rodape={
          <>
            <button className="btn btn-fantasma" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button className="btn btn-primario" onClick={salvar}>
              {editando ? 'Salvar' : 'Adicionar'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label className="campo campo-largo">
            <span>Nome completo</span>
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              autoFocus
            />
          </label>
          {escolas.length > 1 && (
            <label className="campo">
              <span>Escola</span>
              <select
                className="select"
                value={form.escolaId}
                onChange={(e) => trocarEscolaForm(e.target.value)}
              >
                {escolas.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="campo">
            <span>Turma</span>
            <select
              className="select"
              value={form.turmaId}
              onChange={(e) => setForm({ ...form, turmaId: e.target.value })}
            >
              {turmasDaEscolaForm.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>E-mail (opcional)</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="campo">
            <span>Telefone dos pais (opcional)</span>
            <input
              type="tel"
              value={form.telefonePais}
              onChange={(e) => setForm({ ...form, telefonePais: e.target.value })}
              placeholder="Ex.: (11) 91234-5678"
            />
          </label>
        </div>
      </Modal>
    </div>
  )
}
