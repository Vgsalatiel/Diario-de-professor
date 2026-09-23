import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { api, ApiError } from '../lib/api'
import { Modal } from '../components/Modal'
import { Drawer } from '../components/Drawer'
import { resumoTexto } from '../lib/texto'
import { pillFrequencia } from './Admin'
import { rotuloTipo, corTipo, formatarData } from '../lib/eventos'
import type {
  AlunoResumoAdmin,
  EventoEscola,
  ObservacaoPedagogica,
  ProfessorDetalheCoordenacao,
  ProfessorResumoCoordenacao,
  TipoObservacao,
  Turno,
  TurmaDetalheCoordenacao,
  TurmaResumoCoordenacao,
} from '../types'

const ROTULO_TURNO: Record<Turno, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }

type Aba = 'professores' | 'turmas' | 'alunos' | 'calendario' | 'observacoes'

const REUNIAO_VAZIA = { titulo: '', data: '', hora: '', turmaId: '', conteudo: '' }
const OBSERVACAO_VAZIA: { professorAlvoId: string; turmaId: string; texto: string; tipo: TipoObservacao } = {
  professorAlvoId: '',
  turmaId: '',
  texto: '',
  tipo: 'comentario',
}

const ROTULO_SITUACAO_REGISTRO: Record<string, string> = {
  boa: '🟢',
  atencao: '🟡',
  critica: '🔴',
  semDados: '—',
}

function ratioTexto(feitas: number, esperadas: number): string {
  return `${feitas}/${esperadas}`
}

const TITULO_ABA: Record<Aba, string> = {
  professores: 'Professores',
  turmas: 'Turmas',
  alunos: 'Alunos',
  calendario: 'Calendário',
  observacoes: 'Observações',
}

function badgeObservacao(o: ObservacaoPedagogica) {
  if (o.tipo !== 'solicitacaoCorrecao') return null
  return (
    <span className={`pill ${o.resolvida ? 'pill-aprovado' : 'pill-recuperacao'}`}>
      {o.resolvida ? 'Correção resolvida' : 'Pede correção'}
    </span>
  )
}

export function Coordenacao() {
  const { notificar } = useToast()
  const { aba: abaParam } = useParams<{ aba: string }>()
  const aba = (abaParam as Aba) || 'professores'

  const [professores, setProfessores] = useState<ProfessorResumoCoordenacao[]>([])
  const [turmas, setTurmas] = useState<TurmaResumoCoordenacao[]>([])
  const [alunos, setAlunos] = useState<AlunoResumoAdmin[]>([])
  const [eventos, setEventos] = useState<EventoEscola[]>([])
  const [observacoes, setObservacoes] = useState<ObservacaoPedagogica[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [professorAberto, setProfessorAberto] = useState<ProfessorDetalheCoordenacao | null>(null)
  const [turmaAberta, setTurmaAberta] = useState<TurmaDetalheCoordenacao | null>(null)

  const [modalReuniao, setModalReuniao] = useState(false)
  const [formReuniao, setFormReuniao] = useState(REUNIAO_VAZIA)
  const [salvandoReuniao, setSalvandoReuniao] = useState(false)

  const [modalObservacao, setModalObservacao] = useState(false)
  const [formObservacao, setFormObservacao] = useState(OBSERVACAO_VAZIA)
  const [salvandoObservacao, setSalvandoObservacao] = useState(false)

  const [turnoFiltro, setTurnoFiltro] = useState<'todos' | Turno>('todos')
  const [serieFiltro, setSerieFiltro] = useState('todas')

  const seriesDisponiveis = useMemo(
    () => Array.from(new Set(turmas.map((t) => t.serie).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [turmas],
  )

  const turmasFiltradas = useMemo(
    () =>
      turmas.filter(
        (t) =>
          (turnoFiltro === 'todos' || t.turno === turnoFiltro) &&
          (serieFiltro === 'todas' || t.serie === serieFiltro),
      ),
    [turmas, turnoFiltro, serieFiltro],
  )

  function carregar() {
    setCarregando(true)
    setErro('')
    Promise.all([
      api.get<ProfessorResumoCoordenacao[]>('/coordenacao/professores'),
      api.get<TurmaResumoCoordenacao[]>('/coordenacao/turmas'),
      api.get<AlunoResumoAdmin[]>('/coordenacao/alunos'),
      api.get<EventoEscola[]>('/coordenacao/eventos'),
      api.get<ObservacaoPedagogica[]>('/coordenacao/observacoes'),
    ])
      .then(([p, t, a, e, o]) => {
        setProfessores(p)
        setTurmas(t)
        setAlunos(a)
        setEventos(e)
        setObservacoes(o)
      })
      .catch((err) => setErro(err instanceof ApiError ? err.message : 'Não foi possível carregar.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  async function abrirProfessor(id: string) {
    try {
      const detalhe = await api.get<ProfessorDetalheCoordenacao>(`/coordenacao/professores/${id}`)
      setProfessorAberto(detalhe)
    } catch (e) {
      notificar(e instanceof ApiError ? e.message : 'Não foi possível abrir esse professor.')
    }
  }

  async function abrirTurma(id: string) {
    try {
      const detalhe = await api.get<TurmaDetalheCoordenacao>(`/coordenacao/turmas/${id}`)
      setTurmaAberta(detalhe)
    } catch (e) {
      notificar(e instanceof ApiError ? e.message : 'Não foi possível abrir essa turma.')
    }
  }

  function abrirNovaReuniao() {
    setFormReuniao(REUNIAO_VAZIA)
    setModalReuniao(true)
  }

  async function salvarReuniao() {
    if (!formReuniao.titulo.trim() || !formReuniao.data) return
    setSalvandoReuniao(true)
    try {
      await api.post('/coordenacao/reunioes', {
        titulo: formReuniao.titulo.trim(),
        data: formReuniao.data,
        hora: formReuniao.hora || undefined,
        turmaId: formReuniao.turmaId || undefined,
        conteudo: formReuniao.conteudo.trim() || undefined,
      })
      notificar('Reunião marcada.')
      setModalReuniao(false)
      carregar()
    } catch (e) {
      notificar(e instanceof ApiError ? e.message : 'Não foi possível marcar a reunião.')
    } finally {
      setSalvandoReuniao(false)
    }
  }

  function abrirNovaObservacao(
    professorAlvoId?: string,
    tipo: TipoObservacao = 'comentario',
    texto = '',
    turmaId = '',
  ) {
    setFormObservacao({ ...OBSERVACAO_VAZIA, professorAlvoId: professorAlvoId ?? '', tipo, texto, turmaId })
    setModalObservacao(true)
  }

  async function salvarObservacao() {
    if (!formObservacao.professorAlvoId || !formObservacao.texto.trim()) return
    setSalvandoObservacao(true)
    try {
      await api.post('/coordenacao/observacoes', {
        professorAlvoId: formObservacao.professorAlvoId,
        turmaId: formObservacao.turmaId || undefined,
        texto: formObservacao.texto.trim(),
        tipo: formObservacao.tipo,
      })
      notificar(
        formObservacao.tipo === 'solicitacaoCorrecao' ? 'Solicitação de correção enviada.' : 'Observação registrada.',
      )
      setModalObservacao(false)
      carregar()
      if (professorAberto?.id === formObservacao.professorAlvoId) abrirProfessor(professorAberto.id)
      if (turmaAberta?.id === formObservacao.turmaId) abrirTurma(turmaAberta.id)
    } catch (e) {
      notificar(e instanceof ApiError ? e.message : 'Não foi possível salvar a observação.')
    } finally {
      setSalvandoObservacao(false)
    }
  }

  async function excluirObservacao(id: string) {
    if (!confirm('Excluir essa observação?')) return
    try {
      await api.delete(`/coordenacao/observacoes/${id}`)
      setObservacoes((os) => os.filter((o) => o.id !== id))
      notificar('Observação excluída.')
    } catch (e) {
      notificar(e instanceof ApiError ? e.message : 'Não foi possível excluir.')
    }
  }

  const turmasDoProfessorObservacao = formObservacao.professorAlvoId
    ? turmas.filter((t) => t.professorId === formObservacao.professorAlvoId)
    : []

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Coordenação pedagógica — {TITULO_ABA[aba]}</h1>
          <p className="pagina-sub">
            Acompanhe professores, turmas e o pedagógico da escola — aulas, frequência,
            avaliações, planejamento e alunos com dificuldade.
          </p>
        </div>
      </header>

      {erro && <div className="alerta-erro">{erro}</div>}

      {carregando ? (
        <p className="texto-suave">Carregando…</p>
      ) : (
        <>
          {aba === 'professores' &&
            (professores.length === 0 ? (
              <div className="vazio painel">
                <p>Nenhum professor cadastrado ainda.</p>
              </div>
            ) : (
              <div className="painel sem-padding rolagem-x">
                <table className="tabela tabela-responsiva">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Turmas</th>
                      <th>Registros</th>
                      <th>Situação</th>
                      <th className="col-acoes">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {professores.map((p) => (
                      <tr key={p.id}>
                        <td className="celula-nome">
                          <button className="link-botao" onClick={() => abrirProfessor(p.id)}>
                            {p.nome}
                          </button>
                        </td>
                        <td data-label="Turmas">{p.turmasNomes.join(' / ') || '—'}</td>
                        <td data-label="Registros">{ratioTexto(p.registrosFeitos, p.registrosEsperados)}</td>
                        <td data-label="Situação">{ROTULO_SITUACAO_REGISTRO[p.situacaoRegistro]}</td>
                        <td className="col-acoes">
                          <button className="btn btn-fantasma btn-pequeno" onClick={() => abrirNovaObservacao(p.id)}>
                            + Comentário
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {aba === 'turmas' &&
            (turmas.length === 0 ? (
              <div className="vazio painel">
                <p>Nenhuma turma cadastrada ainda.</p>
              </div>
            ) : (
              <div className="stack-md">
                <div className="barra-filtros">
                  <select
                    className="select"
                    aria-label="Série"
                    value={serieFiltro}
                    onChange={(e) => setSerieFiltro(e.target.value)}
                  >
                    <option value="todas">Todas as séries</option>
                    {seriesDisponiveis.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="abas abas-pequeno">
                    <button
                      className={`aba ${turnoFiltro === 'todos' ? 'ativa' : ''}`}
                      onClick={() => setTurnoFiltro('todos')}
                    >
                      Todos os turnos
                    </button>
                    <button
                      className={`aba ${turnoFiltro === 'manha' ? 'ativa' : ''}`}
                      onClick={() => setTurnoFiltro('manha')}
                    >
                      Manhã
                    </button>
                    <button
                      className={`aba ${turnoFiltro === 'tarde' ? 'ativa' : ''}`}
                      onClick={() => setTurnoFiltro('tarde')}
                    >
                      Tarde
                    </button>
                    <button
                      className={`aba ${turnoFiltro === 'noite' ? 'ativa' : ''}`}
                      onClick={() => setTurnoFiltro('noite')}
                    >
                      Noite
                    </button>
                  </div>
                </div>

                {turmasFiltradas.length === 0 ? (
                  <div className="vazio painel">
                    <p>Nenhuma turma nesse filtro.</p>
                  </div>
                ) : (
                  <div className="grid-turmas">
                    {turmasFiltradas.map((t) => (
                      <article
                        key={t.id}
                        className="card-turma card-turma-clicavel"
                        onClick={() => abrirTurma(t.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <div
                          className="card-turma-faixa"
                          style={{
                            background:
                              t.frequenciaMedia == null
                                ? 'var(--line-forte)'
                                : t.frequenciaMedia >= 75
                                  ? 'var(--verde-texto)'
                                  : 'var(--vermelho-texto)',
                          }}
                        />
                        <div className="card-turma-corpo">
                          <h2>{t.nome}</h2>
                          <p className="texto-suave">
                            {t.escola}
                            {t.turno && ` · ${ROTULO_TURNO[t.turno]}`}
                          </p>
                          <div className="card-turma-meta">
                            <span>{t.totalAlunos} aluno(s)</span>
                          </div>
                          <p>
                            Frequência:{' '}
                            <strong>{t.frequenciaMedia == null ? '—' : `${t.frequenciaMedia}%`}</strong>
                          </p>
                          <p>
                            Média:{' '}
                            <strong>{t.mediaTurma == null ? '—' : String(t.mediaTurma).replace('.', ',')}</strong>
                          </p>
                          <p className="texto-suave">Professor responsável: {t.professorNome}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ))}

          {aba === 'alunos' &&
            (alunos.length === 0 ? (
              <div className="vazio painel">
                <p>Nenhum aluno cadastrado ainda.</p>
              </div>
            ) : (
              <div className="painel sem-padding rolagem-x">
                <table className="tabela tabela-responsiva">
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
                    {alunos.map((a) => (
                      <tr key={a.id}>
                        <td className="celula-nome">{a.nome}</td>
                        <td data-label="Turma">{a.turmaNome}</td>
                        <td data-label="Escola">{a.escola}</td>
                        <td data-label="Professor(a)">{a.professorNome}</td>
                        <td data-label="Situação">{a.situacao}</td>
                        <td data-label="Frequência">{pillFrequencia(a.frequenciaPercentual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {aba === 'calendario' && (
            <div className="stack-md">
              <div>
                <button className="btn btn-primario" onClick={abrirNovaReuniao}>
                  Nova reunião
                </button>
              </div>
              {eventos.length === 0 ? (
                <div className="vazio painel">
                  <p>Nada no calendário pedagógico ainda.</p>
                </div>
              ) : (
                <ul className="lista-eventos">
                  {eventos.map((e) => (
                    <li key={e.id} className="evento-item">
                      <span className="evento-tag" style={{ background: corTipo(e.tipo) }}>
                        {rotuloTipo(e.tipo)}
                      </span>
                      <div className="evento-info">
                        <strong>{e.titulo}</strong>
                        <span className="evento-turma">
                          {e.professorNome}
                          {e.turmaNome && ` · ${e.turmaNome}`}
                        </span>
                      </div>
                      <span className="evento-data">
                        {formatarData(e.data)}
                        {e.hora && ` às ${e.hora}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {aba === 'observacoes' && (
            <div className="stack-md">
              <div className="grupo-botoes">
                <button className="btn btn-primario" onClick={() => abrirNovaObservacao()}>
                  Novo comentário
                </button>
                <button className="btn btn-fantasma" onClick={() => abrirNovaObservacao(undefined, 'solicitacaoCorrecao')}>
                  Nova solicitação de correção
                </button>
              </div>
              {observacoes.length === 0 ? (
                <div className="vazio painel">
                  <p>Nenhuma observação registrada ainda.</p>
                </div>
              ) : (
                <ul className="lista-eventos">
                  {observacoes.map((o) => (
                    <li key={o.id} className="evento-item">
                      <div className="evento-info">
                        <strong>
                          {o.professorAlvoNome} {badgeObservacao(o)}
                        </strong>
                        <span className="evento-turma">
                          {o.turmaNome ?? 'sem turma específica'} · por {o.autorNome} ·{' '}
                          {new Date(o.criadoEm).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="texto-suave">{o.texto}</span>
                      </div>
                      <button className="icon-btn" aria-label="Excluir" onClick={() => excluirObservacao(o.id)}>
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      <Drawer
        aberto={!!professorAberto}
        titulo={professorAberto?.nome ?? ''}
        onFechar={() => setProfessorAberto(null)}
      >
        {professorAberto && (
          <div className="stack-md">
            <p className="texto-suave">{professorAberto.email}</p>

            <div>
              <h3 className="titulo-secao">Turmas</h3>
              {professorAberto.turmas.length === 0 ? (
                <p className="texto-suave">Nenhuma turma.</p>
              ) : (
                <ul className="lista-simples">
                  {professorAberto.turmas.map((t) => (
                    <li key={t.id}>
                      <span>{t.nome}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="titulo-secao">Disciplinas</h3>
              {professorAberto.materias.length === 0 ? (
                <p className="texto-suave">Nenhuma matéria definida.</p>
              ) : (
                <ul className="lista-simples">
                  {professorAberto.materias.map((m) => (
                    <li key={m}>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="titulo-secao">Registros</h3>
              <ul className="lista-simples">
                <li>
                  <span>Aulas</span>
                  <span className="texto-suave">
                    {ratioTexto(professorAberto.registros.aulas.feitas, professorAberto.registros.aulas.esperadas)}
                  </span>
                </li>
                <li>
                  <span>Frequência</span>
                  <span className="texto-suave">
                    {ratioTexto(
                      professorAberto.registros.frequencia.feitas,
                      professorAberto.registros.frequencia.esperadas,
                    )}
                  </span>
                </li>
                <li>
                  <span>Avaliações</span>
                  <span className="texto-suave">
                    {ratioTexto(
                      professorAberto.registros.avaliacoes.feitas,
                      professorAberto.registros.avaliacoes.esperadas,
                    )}
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="titulo-secao">Pendências</h3>
              {professorAberto.pendencias.length === 0 ? (
                <p className="texto-suave">Nenhuma pendência. 🎉</p>
              ) : (
                <ul className="lista-marcada">
                  {professorAberto.pendencias.map((texto) => (
                    <li key={texto}>
                      <span>{texto}</span>{' '}
                      <button
                        className="link-botao"
                        onClick={() =>
                          abrirNovaObservacao(
                            professorAberto.id,
                            'solicitacaoCorrecao',
                            `Poderia corrigir: ${texto.charAt(0).toLowerCase()}${texto.slice(1)}?`,
                          )
                        }
                      >
                        Solicitar correção
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="titulo-secao">Planejamento recente</h3>
              {professorAberto.planosDeAula.length === 0 ? (
                <p className="texto-suave">Nenhum plano de aula cadastrado.</p>
              ) : (
                <ul className="lista-simples">
                  {professorAberto.planosDeAula.map((p) => (
                    <li key={p.id}>
                      <span>
                        {p.titulo} — {p.turmaNome}
                      </span>
                      <span className="texto-suave">
                        {formatarData(p.dataInicio)} a {formatarData(p.dataFim)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="titulo-secao">Alunos com dificuldade</h3>
              {professorAberto.alunosComDificuldade.length === 0 ? (
                <p className="texto-suave">Nenhuma registrada.</p>
              ) : (
                <ul className="lista-simples">
                  {professorAberto.alunosComDificuldade.map((a) => (
                    <li key={a.id}>
                      <span>
                        <strong>{a.nome}</strong> — {a.turmaNome}
                      </span>
                      <span className="texto-suave">{a.dificuldades}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="titulo-secao">Observações</h3>
              {professorAberto.observacoes.length === 0 ? (
                <p className="texto-suave">Nenhuma observação ainda.</p>
              ) : (
                <ul className="lista-simples">
                  {professorAberto.observacoes.map((o) => (
                    <li key={o.id}>
                      <span>
                        {badgeObservacao(o)} {o.texto}
                      </span>
                      <span className="texto-suave">
                        {o.autorNome} · {new Date(o.criadoEm).toLocaleDateString('pt-BR')}
                        {o.turmaNome && ` · ${o.turmaNome}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="grupo-botoes">
                <button className="btn btn-fantasma" onClick={() => abrirNovaObservacao(professorAberto.id)}>
                  + Comentário
                </button>
                <button
                  className="btn btn-fantasma"
                  onClick={() => abrirNovaObservacao(professorAberto.id, 'solicitacaoCorrecao')}
                >
                  + Solicitar correção
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer aberto={!!turmaAberta} titulo={turmaAberta?.nome ?? ''} onFechar={() => setTurmaAberta(null)}>
        {turmaAberta && (
          <div className="stack-md">
            <p className="texto-suave">
              {turmaAberta.escola}
              {turmaAberta.serie && ` · ${turmaAberta.serie}`}
              {turmaAberta.turno && ` · ${ROTULO_TURNO[turmaAberta.turno]}`} · {turmaAberta.totalAlunos} aluno(s)
            </p>

            <div>
              <h3 className="titulo-secao">Alunos</h3>
              {turmaAberta.alunos.length === 0 ? (
                <p className="texto-suave">Nenhum aluno cadastrado.</p>
              ) : (
                <ul className="lista-simples">
                  {turmaAberta.alunos.map((a) => (
                    <li key={a.id}>
                      <span>
                        <strong>{a.nome}</strong>
                        {a.situacao !== 'ativo' && (
                          <span className="texto-suave"> · {a.situacao}</span>
                        )}
                        {a.dificuldades && (
                          <>
                            <br />
                            <span className="texto-suave">{a.dificuldades}</span>
                          </>
                        )}
                      </span>
                      {pillFrequencia(a.frequenciaPercentual)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="titulo-secao">Frequência</h3>
              <p>
                Frequência média da turma:{' '}
                <strong>{turmaAberta.frequenciaMedia == null ? '—' : `${turmaAberta.frequenciaMedia}%`}</strong>
              </p>
              {turmaAberta.alunos.filter((a) => (a.frequenciaPercentual ?? 100) < 75).length > 0 && (
                <ul className="lista-simples">
                  {turmaAberta.alunos
                    .filter((a) => (a.frequenciaPercentual ?? 100) < 75)
                    .map((a) => (
                      <li key={a.id}>
                        <span>{a.nome}</span>
                        {pillFrequencia(a.frequenciaPercentual)}
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="titulo-secao">Avaliações</h3>
              <p>
                Média geral da turma:{' '}
                <strong>{turmaAberta.mediaTurma == null ? '—' : String(turmaAberta.mediaTurma).replace('.', ',')}</strong>
              </p>
              {turmaAberta.mediasPorAvaliacao.length === 0 ? (
                <p className="texto-suave">Nenhuma avaliação cadastrada.</p>
              ) : (
                <ul className="lista-simples">
                  {turmaAberta.mediasPorAvaliacao.map((av) => (
                    <li key={av.id}>
                      <span>{av.nome}</span>
                      <span className="texto-suave">
                        {av.mediaTurma != null
                          ? `Média ${String(av.mediaTurma).replace('.', ',')} (${av.totalLancadas} nota(s))`
                          : 'Sem notas lançadas'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="titulo-secao">Aulas</h3>
              {turmaAberta.planoAtivo && (
                <p className="texto-suave">
                  Plano em andamento: {turmaAberta.planoAtivo.titulo} ({formatarData(turmaAberta.planoAtivo.dataInicio)}{' '}
                  a {formatarData(turmaAberta.planoAtivo.dataFim)})
                </p>
              )}
              {turmaAberta.aulasRecentes.length === 0 ? (
                <p className="texto-suave">Nenhum registro de aula ainda.</p>
              ) : (
                <ul className="lista-simples">
                  {turmaAberta.aulasRecentes.map((r, i) => (
                    <li key={i}>
                      <span>
                        <strong>{r.data && formatarData(r.data)}</strong>
                      </span>
                      <span className="texto-suave">{resumoTexto(r.resumo, 200)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="titulo-secao">Professor(es)</h3>
              <ul className="lista-simples">
                <li>
                  <span>
                    <strong>{turmaAberta.professor.nome}</strong>
                    <br />
                    <span className="texto-suave">
                      {turmaAberta.professor.email} · {turmaAberta.professor.materias.join(', ') || 'sem matéria definida'}
                    </span>
                  </span>
                </li>
              </ul>
              <div className="grupo-botoes">
                <button
                  className="btn btn-fantasma btn-pequeno"
                  onClick={() => abrirNovaObservacao(turmaAberta.professor.id, 'comentario', '', turmaAberta.id)}
                >
                  + Comentário
                </button>
                <button
                  className="btn btn-fantasma btn-pequeno"
                  onClick={() =>
                    abrirNovaObservacao(turmaAberta.professor.id, 'solicitacaoCorrecao', '', turmaAberta.id)
                  }
                >
                  + Solicitar correção
                </button>
              </div>
            </div>

            <div>
              <h3 className="titulo-secao">Atividades</h3>
              {turmaAberta.atividades.length === 0 ? (
                <p className="texto-suave">Nenhuma prova/atividade agendada.</p>
              ) : (
                <ul className="lista-simples">
                  {turmaAberta.atividades.map((e) => (
                    <li key={e.id}>
                      <span>
                        <span className="evento-tag" style={{ background: corTipo(e.tipo) }}>
                          {rotuloTipo(e.tipo)}
                        </span>{' '}
                        {e.titulo}
                      </span>
                      <span className="texto-suave">
                        {formatarData(e.data)} {e.concluido && '· concluída'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="titulo-secao">Observações</h3>
              {turmaAberta.observacoes.length === 0 ? (
                <p className="texto-suave">Nenhuma observação sobre esta turma ainda.</p>
              ) : (
                <ul className="lista-simples">
                  {turmaAberta.observacoes.map((o) => (
                    <li key={o.id}>
                      <span>
                        {badgeObservacao(o)} {o.texto}
                      </span>
                      <span className="texto-suave">
                        {o.autorNome} · {new Date(o.criadoEm).toLocaleDateString('pt-BR')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        aberto={modalReuniao}
        titulo="Nova reunião pedagógica"
        onFechar={() => setModalReuniao(false)}
        rodape={
          <>
            <button className="btn btn-fantasma" onClick={() => setModalReuniao(false)}>
              Cancelar
            </button>
            <button className="btn btn-primario" onClick={salvarReuniao} disabled={salvandoReuniao}>
              {salvandoReuniao ? 'Salvando...' : 'Marcar'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label className="campo campo-largo">
            <span>Título</span>
            <input
              value={formReuniao.titulo}
              onChange={(e) => setFormReuniao({ ...formReuniao, titulo: e.target.value })}
              placeholder="Ex.: Reunião de planejamento bimestral"
              autoFocus
            />
          </label>
          <label className="campo">
            <span>Turma (opcional)</span>
            <select
              className="select"
              value={formReuniao.turmaId}
              onChange={(e) => setFormReuniao({ ...formReuniao, turmaId: e.target.value })}
            >
              <option value="">— Nenhuma —</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} — {t.professorNome}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Data</span>
            <input
              type="date"
              value={formReuniao.data}
              onChange={(e) => setFormReuniao({ ...formReuniao, data: e.target.value })}
            />
          </label>
          <label className="campo">
            <span>Horário (opcional)</span>
            <input
              type="time"
              value={formReuniao.hora}
              onChange={(e) => setFormReuniao({ ...formReuniao, hora: e.target.value })}
            />
          </label>
          <label className="campo campo-largo">
            <span>Pauta (opcional)</span>
            <textarea
              rows={3}
              value={formReuniao.conteudo}
              onChange={(e) => setFormReuniao({ ...formReuniao, conteudo: e.target.value })}
            />
          </label>
        </div>
      </Modal>

      <Modal
        aberto={modalObservacao}
        titulo={formObservacao.tipo === 'solicitacaoCorrecao' ? 'Nova solicitação de correção' : 'Novo comentário'}
        onFechar={() => setModalObservacao(false)}
        rodape={
          <>
            <button className="btn btn-fantasma" onClick={() => setModalObservacao(false)}>
              Cancelar
            </button>
            <button className="btn btn-primario" onClick={salvarObservacao} disabled={salvandoObservacao}>
              {salvandoObservacao ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label className="campo campo-largo">
            <span>Tipo</span>
            <select
              className="select"
              value={formObservacao.tipo}
              onChange={(e) => setFormObservacao({ ...formObservacao, tipo: e.target.value as TipoObservacao })}
            >
              <option value="comentario">Comentário — só um registro, o professor lê</option>
              <option value="solicitacaoCorrecao">
                Solicitação de correção — pede um ajuste, o professor marca como resolvido
              </option>
            </select>
          </label>
          <label className="campo campo-largo">
            <span>Professor(a)</span>
            <select
              className="select"
              value={formObservacao.professorAlvoId}
              onChange={(e) =>
                setFormObservacao({ ...formObservacao, professorAlvoId: e.target.value, turmaId: '' })
              }
            >
              <option value="">Selecione…</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="campo campo-largo">
            <span>Turma (opcional)</span>
            <select
              className="select"
              value={formObservacao.turmaId}
              onChange={(e) => setFormObservacao({ ...formObservacao, turmaId: e.target.value })}
              disabled={turmasDoProfessorObservacao.length === 0}
            >
              <option value="">— Nenhuma —</option>
              {turmasDoProfessorObservacao.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="campo campo-largo">
            <span>Observação</span>
            <textarea
              rows={4}
              value={formObservacao.texto}
              onChange={(e) => setFormObservacao({ ...formObservacao, texto: e.target.value })}
              placeholder="Ex.: Combinado reforço de matemática pra Ana Clara a partir da próxima semana."
              autoFocus
            />
          </label>
        </div>
      </Modal>
    </div>
  )
}
