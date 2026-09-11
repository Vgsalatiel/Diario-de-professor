import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Evento, TipoEvento } from '../types'
import { corTipo, formatarData, rotuloTipo } from '../lib/eventos'
import { Modal } from '../components/Modal'

const TIPOS: TipoEvento[] = ['prova', 'trabalho', 'reuniao', 'outro']

const hojeISO = () => new Date().toISOString().slice(0, 10)

const VAZIO = {
  titulo: '',
  tipo: 'prova' as TipoEvento,
  data: hojeISO(),
  hora: '',
  turmaId: '',
  conteudo: '',
}

export function Agenda() {
  const { eventos, turmas, criarEvento, atualizarEvento, removerEvento } = useData()
  const { notificar } = useToast()
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Evento | null>(null)
  const [form, setForm] = useState(VAZIO)
  const [filtro, setFiltro] = useState<'proximos' | 'todos'>('proximos')

  const listagem = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return [...eventos]
      .filter((e) =>
        filtro === 'proximos'
          ? new Date(e.data + 'T00:00:00') >= hoje
          : true,
      )
      .sort((a, b) => {
        const d = a.data.localeCompare(b.data)
        return d !== 0 ? d : (a.hora ?? '').localeCompare(b.hora ?? '')
      })
  }, [eventos, filtro])

  function abrirNovo() {
    setEditando(null)
    setForm(VAZIO)
    setModal(true)
  }

  function abrirEdicao(e: Evento) {
    setEditando(e)
    setForm({
      titulo: e.titulo,
      tipo: e.tipo,
      data: e.data,
      hora: e.hora ?? '',
      turmaId: e.turmaId ?? '',
      conteudo: e.conteudo ?? '',
    })
    setModal(true)
  }

  function salvar() {
    if (!form.titulo.trim() || !form.data) return
    const dados = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      data: form.data,
      hora: form.hora || undefined,
      turmaId: form.turmaId || undefined,
      conteudo: form.conteudo.trim() || undefined,
    }
    if (editando) {
      atualizarEvento(editando.id, dados)
      notificar('Evento atualizado.')
    } else {
      criarEvento(dados)
      notificar('Evento adicionado.')
    }
    setModal(false)
  }

  function excluir(e: Evento) {
    if (confirm(`Excluir "${e.titulo}"?`)) removerEvento(e.id)
  }

  const nomeTurma = (id?: string) =>
    id ? (turmas.find((t) => t.id === id)?.nome ?? '') : ''

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Agenda</h1>
          <p className="pagina-sub">
            Provas, trabalhos, reuniões e outros compromissos.
          </p>
        </div>
        <button className="btn btn-primario" onClick={abrirNovo}>
          Novo evento
        </button>
      </header>

      <div className="abas">
        <button
          className={`aba ${filtro === 'proximos' ? 'ativa' : ''}`}
          onClick={() => setFiltro('proximos')}
        >
          Próximos
        </button>
        <button
          className={`aba ${filtro === 'todos' ? 'ativa' : ''}`}
          onClick={() => setFiltro('todos')}
        >
          Todos
        </button>
      </div>

      {listagem.length === 0 ? (
        <div className="vazio painel">
          <p>
            {filtro === 'proximos'
              ? 'Nenhum evento futuro. Que tal agendar a próxima prova?'
              : 'Nenhum evento cadastrado ainda.'}
          </p>
          <button className="btn btn-primario" onClick={abrirNovo}>
            Adicionar evento
          </button>
        </div>
      ) : (
        <div className="timeline">
          {listagem.map((e) => (
            <article key={e.id} className="evento-cartao">
              <div
                className="evento-cartao-barra"
                style={{ background: corTipo(e.tipo) }}
              />
              <div className="evento-cartao-data">
                <span className="dia">{e.data.split('-')[2]}</span>
                <span className="mes">{mesAbrev(e.data)}</span>
              </div>
              <div className="evento-cartao-corpo">
                <div className="evento-cartao-topo">
                  <span
                    className="evento-tag"
                    style={{ background: corTipo(e.tipo) }}
                  >
                    {rotuloTipo(e.tipo)}
                  </span>
                  {e.hora && <span className="evento-hora">{e.hora}</span>}
                  {e.turmaId && (
                    <span className="evento-turma">{nomeTurma(e.turmaId)}</span>
                  )}
                </div>
                <h3>{e.titulo}</h3>
                {e.conteudo && <p className="evento-conteudo">{e.conteudo}</p>}
                <span className="evento-data-completa">{formatarData(e.data)}</span>
              </div>
              <div className="evento-cartao-acoes">
                <button
                  className="btn btn-fantasma btn-pequeno"
                  onClick={() => abrirEdicao(e)}
                >
                  Editar
                </button>
                <button
                  className="btn btn-perigo-fantasma btn-pequeno"
                  onClick={() => excluir(e)}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        aberto={modal}
        titulo={editando ? 'Editar evento' : 'Novo evento'}
        onFechar={() => setModal(false)}
        rodape={
          <>
            <button className="btn btn-fantasma" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button className="btn btn-primario" onClick={salvar}>
              {editando ? 'Salvar' : 'Agendar'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label className="campo campo-largo">
            <span>Título</span>
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex.: Prova de Matemática"
              autoFocus
            />
          </label>
          <label className="campo">
            <span>Tipo</span>
            <select
              className="select"
              value={form.tipo}
              onChange={(e) =>
                setForm({ ...form, tipo: e.target.value as TipoEvento })
              }
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {rotuloTipo(t)}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Turma (opcional)</span>
            <select
              className="select"
              value={form.turmaId}
              onChange={(e) => setForm({ ...form, turmaId: e.target.value })}
            >
              <option value="">— Nenhuma —</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Data</span>
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </label>
          <label className="campo">
            <span>Horário (opcional)</span>
            <input
              type="time"
              value={form.hora}
              onChange={(e) => setForm({ ...form, hora: e.target.value })}
            />
          </label>
          <label className="campo campo-largo">
            <span>Conteúdo / observações</span>
            <textarea
              rows={3}
              value={form.conteudo}
              onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
              placeholder="Assuntos que serão cobrados, instruções, etc."
            />
          </label>
        </div>
      </Modal>
    </div>
  )
}

function mesAbrev(iso: string): string {
  const meses = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez',
  ]
  const mes = Number(iso.split('-')[1]) - 1
  return meses[mes] ?? ''
}
