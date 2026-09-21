import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useAnoLetivo } from '../context/AnoLetivoContext'
import type { Evento, TipoEvento } from '../types'
import { corTipo, formatarData, rotuloTipo } from '../lib/eventos'
import { hojeISO } from '../lib/data'
import { Modal } from '../components/Modal'

const TIPOS: TipoEvento[] = ['prova', 'trabalho', 'reuniao', 'outro']

const VAZIO = {
  titulo: '',
  tipo: 'prova' as TipoEvento,
  data: hojeISO(),
  hora: '',
  turmaId: '',
  conteudo: '',
}

type Filtro = 'proximos' | 'todos' | 'concluidos'
type Secao = 'eventos' | 'feriados'

const FERIADO_VAZIO = { data: hojeISO(), titulo: '' }

export function Agenda() {
  const { eventos, turmas, criarEvento, atualizarEvento, removerEvento, feriados, criarFeriado, removerFeriado } =
    useData()
  const { notificar } = useToast()
  const { anoAtivo } = useAnoLetivo()
  const [secao, setSecao] = useState<Secao>('eventos')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Evento | null>(null)
  const [form, setForm] = useState(VAZIO)
  const [filtro, setFiltro] = useState<Filtro>('proximos')
  const [diaFiltro, setDiaFiltro] = useState('')

  const [modalFeriado, setModalFeriado] = useState(false)
  const [formFeriado, setFormFeriado] = useState(FERIADO_VAZIO)
  const [salvandoFeriado, setSalvandoFeriado] = useState(false)

  const feriadosFuturos = useMemo(
    () => [...feriados].filter((f) => f.data >= hojeISO()).sort((a, b) => a.data.localeCompare(b.data)),
    [feriados],
  )

  function abrirNovoFeriado() {
    setFormFeriado(FERIADO_VAZIO)
    setModalFeriado(true)
  }

  async function salvarFeriado() {
    if (!formFeriado.data || !formFeriado.titulo.trim()) return
    setSalvandoFeriado(true)
    try {
      await criarFeriado(formFeriado.data, formFeriado.titulo.trim())
      notificar('Feriado/dia sem aula adicionado.')
      setModalFeriado(false)
    } catch {
      // erro já notificado pelo DataContext
    } finally {
      setSalvandoFeriado(false)
    }
  }

  function excluirFeriado(id: string, titulo: string) {
    if (confirm(`Remover "${titulo}" da lista de feriados/dias sem aula?`)) {
      removerFeriado(id).catch(() => {
        // erro já notificado pelo DataContext
      })
    }
  }

  function trocarFiltro(f: Filtro) {
    setFiltro(f)
    setDiaFiltro('')
  }

  const listagem = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return [...eventos]
      .filter((e) => {
        if (filtro === 'proximos') {
          return !e.concluido && new Date(e.data + 'T00:00:00') >= hoje
        }
        if (filtro === 'concluidos') {
          if (!e.concluido) return false
        } else if (e.concluido) {
          return false
        }
        return diaFiltro ? e.data === diaFiltro : true
      })
      .sort((a, b) => {
        const d = a.data.localeCompare(b.data)
        return d !== 0 ? d : (a.hora ?? '').localeCompare(b.hora ?? '')
      })
  }, [eventos, filtro, diaFiltro])

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
      criarEvento(dados).catch(() => {
        // erro já notificado pelo DataContext
      })
      notificar('Evento adicionado.')
    }
    setModal(false)
  }

  function excluir(e: Evento) {
    if (confirm(`Excluir "${e.titulo}"?`)) removerEvento(e.id)
  }

  function concluir(e: Evento) {
    atualizarEvento(e.id, { concluido: true })
    notificar('Evento marcado como concluído.')
  }

  function reabrir(e: Evento) {
    atualizarEvento(e.id, { concluido: false })
    notificar('Evento reaberto.')
  }

  const nomeTurma = (id?: string) =>
    id ? (turmas.find((t) => t.id === id)?.nome ?? '') : ''

  const turmasDoAno = useMemo(
    () => turmas.filter((t) => t.anoLetivo === anoAtivo),
    [turmas, anoAtivo],
  )

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Agenda</h1>
          <p className="pagina-sub">
            Provas, trabalhos, reuniões, outros compromissos e feriados/dias sem aula.
          </p>
        </div>
        {secao === 'eventos' ? (
          <button className="btn btn-primario" onClick={abrirNovo}>
            Novo evento
          </button>
        ) : (
          <button className="btn btn-primario" onClick={abrirNovoFeriado}>
            Novo feriado/dia sem aula
          </button>
        )}
      </header>

      <div className="abas">
        <button
          className={`aba ${secao === 'eventos' ? 'ativa' : ''}`}
          onClick={() => setSecao('eventos')}
        >
          Eventos
        </button>
        <button
          className={`aba ${secao === 'feriados' ? 'ativa' : ''}`}
          onClick={() => setSecao('feriados')}
        >
          Feriados e dias sem aula
        </button>
      </div>

      {secao === 'eventos' ? (
        <>
      <div className="barra-config">
        <div className="abas">
          <button
            className={`aba ${filtro === 'proximos' ? 'ativa' : ''}`}
            onClick={() => trocarFiltro('proximos')}
          >
            Próximos
          </button>
          <button
            className={`aba ${filtro === 'todos' ? 'ativa' : ''}`}
            onClick={() => trocarFiltro('todos')}
          >
            Todos
          </button>
          <button
            className={`aba ${filtro === 'concluidos' ? 'ativa' : ''}`}
            onClick={() => trocarFiltro('concluidos')}
          >
            Concluídos
          </button>
        </div>

        {filtro !== 'proximos' && (
          <label className="campo-inline campo-inline-fim">
            <span>Filtrar por dia</span>
            <div className="navegador-dia">
              <input
                type="date"
                value={diaFiltro}
                onChange={(e) => setDiaFiltro(e.target.value)}
              />
              {diaFiltro && (
                <button
                  type="button"
                  className="btn btn-fantasma btn-pequeno"
                  onClick={() => setDiaFiltro('')}
                >
                  Limpar
                </button>
              )}
            </div>
          </label>
        )}
      </div>

      {listagem.length === 0 ? (
        <div className="vazio painel">
          <p>
            {filtro === 'proximos'
              ? 'Nenhum evento futuro. Que tal agendar a próxima prova?'
              : filtro === 'concluidos'
                ? diaFiltro
                  ? 'Nenhum evento concluído nesse dia.'
                  : 'Nenhum evento concluído ainda.'
                : diaFiltro
                  ? 'Nenhum evento nesse dia.'
                  : 'Nenhum evento cadastrado ainda.'}
          </p>
          {filtro !== 'concluidos' && (
            <button className="btn btn-primario" onClick={abrirNovo}>
              Adicionar evento
            </button>
          )}
        </div>
      ) : (
        <div className="timeline">
          {listagem.map((e) => (
            <article key={e.id} className={`evento-cartao ${e.concluido ? 'concluido' : ''}`}>
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
                {e.prazo && (
                  <span className="evento-data-completa evento-prazo">
                    Entrega até {formatarData(e.prazo)}
                  </span>
                )}
              </div>
              <div className="evento-cartao-acoes">
                {e.concluido ? (
                  <button
                    className="btn btn-fantasma btn-pequeno"
                    onClick={() => reabrir(e)}
                  >
                    ↺ Reabrir
                  </button>
                ) : (
                  <button
                    className="btn btn-fantasma btn-pequeno"
                    onClick={() => concluir(e)}
                  >
                    ✓ Concluir
                  </button>
                )}
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
        </>
      ) : (
        <>
          {feriadosFuturos.length === 0 ? (
            <div className="vazio painel">
              <p>Nenhum feriado ou dia sem aula cadastrado a partir de hoje.</p>
              <button className="btn btn-primario" onClick={abrirNovoFeriado}>
                Adicionar feriado/dia sem aula
              </button>
            </div>
          ) : (
            <ul className="lista-simples">
              {feriadosFuturos.map((f) => (
                <li key={f.id ?? f.data}>
                  <span>
                    <strong>{formatarData(f.data)}</strong> — {f.titulo}
                    {f.origemAutomatica && (
                      <span className="texto-suave"> (feriado nacional)</span>
                    )}
                  </span>
                  {!f.origemAutomatica && f.id && (
                    <button
                      className="icon-btn"
                      aria-label="Remover"
                      onClick={() => excluirFeriado(f.id!, f.titulo)}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
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
              {turmasDoAno.map((t) => (
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

      <Modal
        aberto={modalFeriado}
        titulo="Novo feriado/dia sem aula"
        onFechar={() => setModalFeriado(false)}
        rodape={
          <>
            <button className="btn btn-fantasma" onClick={() => setModalFeriado(false)}>
              Cancelar
            </button>
            <button className="btn btn-primario" onClick={salvarFeriado} disabled={salvandoFeriado}>
              {salvandoFeriado ? 'Salvando...' : 'Adicionar'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label className="campo">
            <span>Data</span>
            <input
              type="date"
              value={formFeriado.data}
              onChange={(e) => setFormFeriado((f) => ({ ...f, data: e.target.value }))}
            />
          </label>
          <label className="campo campo-largo">
            <span>Título</span>
            <input
              value={formFeriado.titulo}
              onChange={(e) => setFormFeriado((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex.: Recesso escolar, Feriado municipal, Ponto facultativo"
              autoFocus
            />
          </label>
          <p className="texto-suave campo-largo">
            Vale pra todas as turmas — nenhum aluno conta falta nesse dia.
          </p>
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
