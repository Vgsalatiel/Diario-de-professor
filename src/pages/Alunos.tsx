import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Aluno, SituacaoMatricula } from '../types'
import { Modal } from '../components/Modal'
import { lerAlunosDaPlanilha, type AlunoImportado } from '../lib/importarAlunos'
import { normalizarNome, validarNome } from '../lib/validarNome'
import { formatarData } from '../lib/eventos'

const SITUACOES: { valor: SituacaoMatricula; rotulo: string; pill: string }[] = [
  { valor: 'ativo', rotulo: 'Ativo', pill: 'pill-aprovado' },
  { valor: 'inativo', rotulo: 'Inativo', pill: 'pill-sem-nota' },
  { valor: 'transferido', rotulo: 'Transferido', pill: 'pill-recuperacao' },
]

function situacaoInfo(situacao: SituacaoMatricula) {
  return SITUACOES.find((s) => s.valor === situacao) ?? SITUACOES[0]
}

export function Alunos() {
  const { turmas, alunos, criarAluno, atualizarAluno, removerAluno } = useData()
  const { notificar } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [escolaFiltro, setEscolaFiltro] = useState('todas')
  const [turmaFiltro, setTurmaFiltro] = useState<string>('todas')
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Aluno | null>(null)
  const [erroForm, setErroForm] = useState('')
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefonePais: '',
    matricula: '',
    dataNascimento: '',
    situacao: 'ativo' as SituacaoMatricula,
    escolaId: '',
    turmaId: turmas[0]?.id ?? '',
  })

  const [modalImportar, setModalImportar] = useState(false)
  const [importando, setImportando] = useState(false)
  const [erroImportar, setErroImportar] = useState('')
  const [alunosImportados, setAlunosImportados] = useState<AlunoImportado[]>([])
  const [importar, setImportar] = useState({ escolaId: '', turmaId: '' })

  // Veio de "Ver alunos" numa turma específica (tela de Turmas) — já abre
  // filtrado nela, sem precisar escolher escola/turma de novo.
  useEffect(() => {
    const turmaParam = searchParams.get('turma')
    if (!turmaParam) return
    const turma = turmas.find((t) => t.id === turmaParam)
    if (turma) {
      setEscolaFiltro(turma.escola)
      setTurmaFiltro(turma.id)
      setBusca('')
    }
    setSearchParams({}, { replace: true })
  }, [searchParams, turmas, setSearchParams])

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
    setErroForm('')
    setForm({
      nome: '',
      email: '',
      telefonePais: '',
      matricula: '',
      dataNascimento: '',
      situacao: 'ativo',
      escolaId: turmaInicial?.escola ?? '',
      turmaId: turmaInicial?.id ?? '',
    })
    setModal(true)
  }

  function abrirEdicao(a: Aluno) {
    const turmaAtual = turmas.find((t) => t.id === a.turmaId)
    setEditando(a)
    setErroForm('')
    setForm({
      nome: a.nome,
      email: a.email ?? '',
      telefonePais: a.telefonePais ?? '',
      matricula: a.matricula ?? '',
      dataNascimento: a.dataNascimento ?? '',
      situacao: a.situacao,
      escolaId: turmaAtual?.escola ?? '',
      turmaId: a.turmaId,
    })
    setModal(true)
  }

  function trocarEscolaForm(escolaId: string) {
    const primeiraTurma = turmas.find((t) => t.escola === escolaId)
    setForm({ ...form, escolaId, turmaId: primeiraTurma?.id ?? '' })
  }

  const turmasDaEscolaImportar = useMemo(
    () => (importar.escolaId ? turmas.filter((t) => t.escola === importar.escolaId) : turmas),
    [turmas, importar.escolaId],
  )

  function abrirModalImportar() {
    if (turmasDaEscola.length === 0) return
    const turmaInicial =
      turmaFiltro !== 'todas' ? turmas.find((t) => t.id === turmaFiltro) : turmasDaEscola[0]
    setAlunosImportados([])
    setErroImportar('')
    setImportar({
      escolaId: turmaInicial?.escola ?? '',
      turmaId: turmaInicial?.id ?? '',
    })
    setModalImportar(true)
  }

  function trocarEscolaImportar(escolaId: string) {
    const primeiraTurma = turmas.find((t) => t.escola === escolaId)
    setImportar({ escolaId, turmaId: primeiraTurma?.id ?? '' })
  }

  async function onArquivoImportar(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setErroImportar('')
    setImportando(true)
    try {
      const encontrados = await lerAlunosDaPlanilha(arquivo)
      const validos = encontrados
        .filter((a) => validarNome(a.nome) === null)
        .map((a) => ({ ...a, nome: normalizarNome(a.nome) }))
      const invalidos = encontrados.length - validos.length

      if (encontrados.length === 0) {
        setErroImportar('Nenhum nome encontrado nessa planilha.')
      } else if (invalidos > 0) {
        setErroImportar(
          `${invalidos} nome(s) ignorado(s) por não parecerem nomes válidos (com número ou símbolo, por exemplo).`,
        )
      }
      setAlunosImportados(validos)
    } catch {
      setErroImportar('Não foi possível ler esse arquivo. Verifique se é um Excel válido.')
      setAlunosImportados([])
    } finally {
      setImportando(false)
    }
  }

  function confirmarImportacao() {
    if (alunosImportados.length === 0 || !importar.turmaId) return
    for (const aluno of alunosImportados) {
      criarAluno({ turmaId: importar.turmaId, situacao: 'ativo', ...aluno })
    }
    notificar(
      alunosImportados.length === 1
        ? '1 aluno importado.'
        : `${alunosImportados.length} alunos importados.`,
    )
    setModalImportar(false)
  }

  function salvar() {
    if (!form.turmaId) return
    const erro = validarNome(form.nome)
    if (erro) {
      setErroForm(erro)
      return
    }
    setErroForm('')
    const dados = {
      nome: normalizarNome(form.nome),
      email: form.email.trim() || undefined,
      telefonePais: form.telefonePais.trim() || undefined,
      matricula: form.matricula.trim() || undefined,
      dataNascimento: form.dataNascimento || undefined,
      situacao: form.situacao,
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
        <div className="grupo-botoes">
          <button
            className="btn btn-fantasma"
            onClick={abrirModalImportar}
            disabled={turmasDaEscola.length === 0}
          >
            Importar Excel
          </button>
          <button
            className="btn btn-primario"
            onClick={abrirNovo}
            disabled={turmasDaEscola.length === 0}
          >
            Novo aluno
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
                  <th>Nome completo</th>
                  <th>Matrícula</th>
                  <th>Turma</th>
                  <th>Data de nascimento</th>
                  <th>Situação</th>
                  <th className="col-acoes">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="celula-vazia">
                      Nenhum aluno encontrado.
                    </td>
                  </tr>
                ) : (
                  lista.map((a) => (
                    <tr key={a.id}>
                      <td className="celula-nome">{a.nome}</td>
                      <td className="texto-suave">{a.matricula || '—'}</td>
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
                      <td className="texto-suave">
                        {a.dataNascimento ? formatarData(a.dataNascimento) : '—'}
                      </td>
                      <td>
                        <span className={`pill ${situacaoInfo(a.situacao).pill}`}>
                          {situacaoInfo(a.situacao).rotulo}
                        </span>
                      </td>
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
          <label className="campo">
            <span>Matrícula (opcional)</span>
            <input
              value={form.matricula}
              onChange={(e) => setForm({ ...form, matricula: e.target.value })}
            />
          </label>
          <label className="campo">
            <span>Data de nascimento (opcional)</span>
            <input
              type="date"
              value={form.dataNascimento}
              onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
            />
          </label>
          <label className="campo">
            <span>Situação</span>
            <select
              className="select"
              value={form.situacao}
              onChange={(e) =>
                setForm({ ...form, situacao: e.target.value as SituacaoMatricula })
              }
            >
              {SITUACOES.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </select>
          </label>
          {erroForm && <div className="alerta-erro campo-largo">{erroForm}</div>}
        </div>
      </Modal>

      <Modal
        aberto={modalImportar}
        titulo="Importar alunos do Excel"
        onFechar={() => setModalImportar(false)}
        rodape={
          <>
            <button className="btn btn-fantasma" onClick={() => setModalImportar(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-primario"
              onClick={confirmarImportacao}
              disabled={alunosImportados.length === 0 || !importar.turmaId}
            >
              Importar {alunosImportados.length > 0 ? `(${alunosImportados.length})` : ''}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label className="campo campo-largo">
            <span>Arquivo Excel</span>
            <input type="file" accept=".xlsx,.xls" onChange={onArquivoImportar} />
          </label>

          {escolas.length > 1 && (
            <label className="campo">
              <span>Escola</span>
              <select
                className="select"
                value={importar.escolaId}
                onChange={(e) => trocarEscolaImportar(e.target.value)}
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
              value={importar.turmaId}
              onChange={(e) => setImportar({ ...importar, turmaId: e.target.value })}
            >
              {turmasDaEscolaImportar.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>

          {importando && <p className="texto-suave campo-largo">Lendo planilha…</p>}
          {erroImportar && <div className="alerta-erro">{erroImportar}</div>}

          {alunosImportados.length > 0 && (
            <div className="campo campo-largo">
              <span>
                {alunosImportados.length} aluno(s) encontrado(s) — serão adicionados à
                turma escolhida acima:
              </span>
              <div className="painel sem-padding rolagem-x">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Matrícula</th>
                      <th>Data de nascimento</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunosImportados.map((a, i) => (
                      <tr key={i}>
                        <td className="celula-nome">{a.nome}</td>
                        <td className="texto-suave">{a.matricula || '—'}</td>
                        <td className="texto-suave">
                          {a.dataNascimento ? formatarData(a.dataNascimento) : '—'}
                        </td>
                        <td>
                          <span
                            className={`pill ${situacaoInfo(a.situacao ?? 'ativo').pill}`}
                          >
                            {situacaoInfo(a.situacao ?? 'ativo').rotulo}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="texto-suave campo-largo">
            A planilha pode ter só uma coluna com o nome, ou colunas com
            cabeçalho — Nome, Matrícula, Data de nascimento, Situação
            (E-mail e Telefone/Número também são lidos se existirem) — em
            qualquer ordem. Sem "Situação" na planilha, o aluno entra como
            Ativo.
          </p>
        </div>
      </Modal>
    </div>
  )
}
