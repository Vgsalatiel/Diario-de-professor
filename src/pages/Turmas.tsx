import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { SistemaPeriodo, Turma } from '../types'
import { Modal } from '../components/Modal'

const CORES = ['#4759a8', '#2f9e6b', '#e8a33d', '#b05ac0', '#d05a5a', '#3aa0b5']

const DIAS_SEMANA = [
  { valor: 1, rotulo: 'Seg' },
  { valor: 2, rotulo: 'Ter' },
  { valor: 3, rotulo: 'Qua' },
  { valor: 4, rotulo: 'Qui' },
  { valor: 5, rotulo: 'Sex' },
  { valor: 6, rotulo: 'Sáb' },
]

const VAZIO = {
  nome: '',
  serie: '',
  anoLetivo: String(new Date().getFullYear()),
  escola: '',
  sistemaPeriodo: 'semestre' as SistemaPeriodo,
  cor: CORES[0],
  diasAula: [1, 2, 3, 4, 5] as number[],
}

function diasAulaResumo(dias: number[]): string {
  if (dias.length === 0) return 'Nenhum dia definido'
  if (dias.length === 5 && [1, 2, 3, 4, 5].every((d) => dias.includes(d))) {
    return 'Segunda a sexta'
  }
  return DIAS_SEMANA.filter((d) => dias.includes(d.valor))
    .map((d) => d.rotulo)
    .join(', ')
}

export function Turmas() {
  const { turmas, alunos, removerTurma, criarTurma, atualizarTurma } = useData()
  const { notificar } = useToast()
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Turma | null>(null)
  const [erroForm, setErroForm] = useState('')
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
    setErroForm('')
    setForm(VAZIO)
    setModal(true)
  }

  function abrirEdicao(t: Turma) {
    setEditando(t)
    setErroForm('')
    setForm({
      nome: t.nome,
      serie: t.serie,
      anoLetivo: t.anoLetivo,
      escola: t.escola,
      sistemaPeriodo: t.sistemaPeriodo,
      cor: t.cor,
      diasAula: t.diasAula,
    })
    setModal(true)
  }

  function alternarDia(dia: number) {
    setForm((f) => ({
      ...f,
      diasAula: f.diasAula.includes(dia)
        ? f.diasAula.filter((d) => d !== dia)
        : [...f.diasAula, dia].sort((a, b) => a - b),
    }))
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
    if (!form.nome.trim()) {
      setErroForm('Informe o nome da turma.')
      return
    }
    if (!form.escola.trim()) {
      setErroForm(
        'Informe a escola — sem isso a turma fica invisível nas telas de Alunos, Notas e Frequência quando você tem mais de uma escola cadastrada.',
      )
      return
    }
    if (form.diasAula.length === 0) {
      setErroForm('Marque pelo menos um dia da semana em que essa turma tem aula.')
      return
    }
    setErroForm('')
    const dados = { ...form, nome: form.nome.trim(), escola: form.escola.trim() }
    if (editando) {
      atualizarTurma(editando.id, dados)
      notificar('Turma atualizada.')
    } else {
      criarTurma(dados)
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
                  <p className="texto-suave">{diasAulaResumo(t.diasAula)}</p>
                  <div className="card-turma-meta">
                    <span>{total} alunos</span>
                    <span>·</span>
                    <span>{t.anoLetivo}</span>
                  </div>
                </div>
                <div className="card-turma-acoes">
                  <Link
                    to={`/alunos?turma=${t.id}`}
                    className="btn btn-fantasma btn-pequeno"
                  >
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
            <span>Dias de aula dessa turma</span>
            <div className="seletor-dias">
              {DIAS_SEMANA.map((d) => (
                <button
                  key={d.valor}
                  type="button"
                  className={`chip-dia ${form.diasAula.includes(d.valor) ? 'sel' : ''}`}
                  onClick={() => alternarDia(d.valor)}
                >
                  {d.rotulo}
                </button>
              ))}
            </div>
            <p className="texto-suave">
              Só esses dias entram na chamada de frequência — os outros nem
              aparecem para lançar presença.
            </p>
          </div>
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
          {erroForm && <div className="alerta-erro campo-largo">{erroForm}</div>}
        </div>
      </Modal>
    </div>
  )
}
