import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { SistemaPeriodo, Turma } from '../types'
import { Modal } from '../components/Modal'

const CORES = ['#4759a8', '#2f9e6b', '#e8a33d', '#b05ac0', '#d05a5a', '#3aa0b5']

const VAZIO = {
  nome: '',
  serie: '',
  anoLetivo: String(new Date().getFullYear()),
  escola: '',
  sistemaPeriodo: 'semestre' as SistemaPeriodo,
  cor: CORES[0],
}

export function Turmas() {
  const { turmas, alunos, removerTurma, criarTurma, atualizarTurma } = useData()
  const { notificar } = useToast()
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Turma | null>(null)
  const [form, setForm] = useState(VAZIO)
  const [escolaFiltro, setEscolaFiltro] = useState('todas')

  const escolas = useMemo(
    () =>
      Array.from(new Set(turmas.map((t) => t.escola).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [turmas],
  )

  const turmasFiltradas = useMemo(
    () =>
      escolaFiltro === 'todas' ? turmas : turmas.filter((t) => t.escola === escolaFiltro),
    [turmas, escolaFiltro],
  )

  function abrirNova() {
    setEditando(null)
    setForm(VAZIO)
    setModal(true)
  }

  function abrirEdicao(t: Turma) {
    setEditando(t)
    setForm({
      nome: t.nome,
      serie: t.serie,
      anoLetivo: t.anoLetivo,
      escola: t.escola,
      sistemaPeriodo: t.sistemaPeriodo,
      cor: t.cor,
    })
    setModal(true)
  }

  // Se já existe alguma turma com esse nome de escola, adota o mesmo
  // sistema (bimestre/semestre) dela — cada escola usa só um sistema.
  function onEscolaChange(nome: string) {
    const existente = turmas.find(
      (t) => t.escola.trim().toLowerCase() === nome.trim().toLowerCase(),
    )
    setForm((f) => ({
      ...f,
      escola: nome,
      sistemaPeriodo: existente ? existente.sistemaPeriodo : f.sistemaPeriodo,
    }))
  }

  function salvar() {
    if (!form.nome.trim()) return
    if (editando) {
      atualizarTurma(editando.id, form)
      notificar('Turma atualizada.')
    } else {
      criarTurma(form)
      notificar('Turma criada.')
    }
    setModal(false)
  }

  function excluir(t: Turma) {
    const n = alunos.filter((a) => a.turmaId === t.id).length
    const msg = n
      ? `Excluir "${t.nome}"? Isso remove também ${n} aluno(s) e suas notas.`
      : `Excluir "${t.nome}"?`
    if (confirm(msg)) removerTurma(t.id)
  }

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Turmas</h1>
          <p className="pagina-sub">Organize suas turmas por série e ano letivo.</p>
        </div>
        <button className="btn btn-primario" onClick={abrirNova}>
          Nova turma
        </button>
      </header>

      {escolas.length > 1 && (
        <div className="abas">
          <button
            className={`aba ${escolaFiltro === 'todas' ? 'ativa' : ''}`}
            onClick={() => setEscolaFiltro('todas')}
          >
            Todas as escolas
          </button>
          {escolas.map((e) => (
            <button
              key={e}
              className={`aba ${escolaFiltro === e ? 'ativa' : ''}`}
              onClick={() => setEscolaFiltro(e)}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {turmas.length === 0 ? (
        <div className="vazio painel">
          <p>Você ainda não tem turmas.</p>
          <button className="btn btn-primario" onClick={abrirNova}>
            Criar primeira turma
          </button>
        </div>
      ) : turmasFiltradas.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhuma turma nesta escola.</p>
        </div>
      ) : (
        <div className="grid-turmas">
          {turmasFiltradas.map((t) => {
            const total = alunos.filter((a) => a.turmaId === t.id).length
            return (
              <article key={t.id} className="card-turma">
                <div className="card-turma-faixa" style={{ background: t.cor }} />
                <div className="card-turma-corpo">
                  <h2>{t.nome}</h2>
                  <p className="texto-suave">{t.serie || 'Sem série definida'}</p>
                  {t.escola && <p className="texto-suave">{t.escola}</p>}
                  <div className="card-turma-meta">
                    <span>{total} alunos</span>
                    <span>·</span>
                    <span>{t.anoLetivo}</span>
                  </div>
                </div>
                <div className="card-turma-acoes">
                  <Link to="/alunos" className="btn btn-fantasma btn-pequeno">
                    Ver alunos
                  </Link>
                  <button
                    className="btn btn-fantasma btn-pequeno"
                    onClick={() => abrirEdicao(t)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-perigo-fantasma btn-pequeno"
                    onClick={() => excluir(t)}
                  >
                    Excluir
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        aberto={modal}
        titulo={editando ? 'Editar turma' : 'Nova turma'}
        onFechar={() => setModal(false)}
        rodape={
          <>
            <button className="btn btn-fantasma" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button className="btn btn-primario" onClick={salvar}>
              {editando ? 'Salvar' : 'Criar turma'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label className="campo campo-largo">
            <span>Nome da turma</span>
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex.: 9º Ano A"
              autoFocus
            />
          </label>
          <label className="campo">
            <span>Série</span>
            <input
              value={form.serie}
              onChange={(e) => setForm({ ...form, serie: e.target.value })}
              placeholder="Ex.: Ensino Fundamental II"
            />
          </label>
          <label className="campo">
            <span>Ano letivo</span>
            <input
              value={form.anoLetivo}
              onChange={(e) => setForm({ ...form, anoLetivo: e.target.value })}
            />
          </label>
          <label className="campo campo-largo">
            <span>Escola</span>
            <input
              value={form.escola}
              onChange={(e) => onEscolaChange(e.target.value)}
              placeholder="Ex.: Escola Estadual Pedro Álvares"
            />
          </label>
          <label className="campo campo-largo">
            <span>Sistema de avaliação dessa escola</span>
            <select
              className="select"
              value={form.sistemaPeriodo}
              onChange={(e) =>
                setForm({ ...form, sistemaPeriodo: e.target.value as SistemaPeriodo })
              }
            >
              <option value="semestre">Semestre (1º e 2º)</option>
              <option value="trimestre">Trimestre (1º ao 3º)</option>
              <option value="bimestre">Bimestre (1º ao 4º)</option>
            </select>
          </label>
          <div className="campo campo-largo">
            <span>Cor de identificação</span>
            <div className="seletor-cor">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`bolha-cor ${form.cor === c ? 'sel' : ''}`}
                  style={{ background: c }}
                  onClick={() => setForm({ ...form, cor: c })}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
