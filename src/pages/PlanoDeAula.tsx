import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { DuracaoPlano, Periodo, PlanoDeAula, SistemaPeriodo } from '../types'
import { opcoesPeriodo, turmaInicial } from '../lib/periodos'
import { formatarData } from '../lib/eventos'
import { Drawer } from '../components/Drawer'
import { EditorRico } from '../components/EditorRico'
import { resumoTexto } from '../lib/texto'

const DURACAO_DIAS: Record<DuracaoPlano, number> = {
  quinzenal: 14,
  semestral: 182,
  personalizado: 0,
}

const ROTULO_DURACAO: Record<DuracaoPlano, string> = {
  quinzenal: 'Quinzenal',
  semestral: 'Semestral',
  personalizado: 'Personalizado',
}

const hojeISO = () => new Date().toISOString().slice(0, 10)

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function mesAbrev(iso: string): string {
  return MESES[Number(iso.split('-')[1]) - 1] ?? ''
}

function adicionarDias(iso: string, dias: number): string {
  if (!iso) return iso
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

// Funções (não constantes) pra "hoje" ser sempre o dia de verdade — se
// isso fosse calculado uma vez só no carregamento do módulo, ficaria
// desatualizado caso a aba do navegador continue aberta de um dia pro outro.
function planoVazio() {
  const hoje = hojeISO()
  return {
    titulo: '',
    turmaId: '',
    duracao: 'quinzenal' as DuracaoPlano,
    dataInicio: hoje,
    dataFim: adicionarDias(hoje, DURACAO_DIAS.quinzenal),
    conteudo: '',
  }
}

function provaVazia() {
  return { titulo: '', data: hojeISO(), conteudo: '', periodo: '1' as Periodo, peso: '1' }
}

function atividadeVazia() {
  return { titulo: '', data: hojeISO(), prazo: hojeISO(), periodo: '1' as Periodo, peso: '1' }
}

function registroVazio() {
  return { data: hojeISO(), resumo: '' }
}

// "Quick add" de prova/atividade direto na criação do plano — campos
// opcionais que, se preenchidos, viram um evento na Agenda ao salvar.
function provaNovaVazia() {
  return { ativo: false, ...provaVazia() }
}

function atividadeNovaVazia() {
  return { ativo: false, ...atividadeVazia() }
}

type DrawerAberto = 'ver' | 'form' | null
type AbaVer = 'conteudo' | 'provas' | 'atividades' | 'registro'

export function PlanoDeAulaPage() {
  const {
    turmas,
    planosDeAula,
    eventos,
    registrosAula,
    criarPlanoDeAula,
    atualizarPlanoDeAula,
    removerPlanoDeAula,
    criarEvento,
    removerEvento,
    criarAvaliacao,
    definirRegistroAula,
  } = useData()
  const { notificar } = useToast()

  const [turmaFiltro, setTurmaFiltro] = useState<string>(() => turmaInicial(turmas))
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)
  const [drawer, setDrawer] = useState<DrawerAberto>(null)
  const [abaVer, setAbaVer] = useState<AbaVer>('conteudo')

  const [editando, setEditando] = useState<PlanoDeAula | null>(null)
  const [erroForm, setErroForm] = useState('')
  const [form, setForm] = useState(planoVazio)
  const [salvandoPlano, setSalvandoPlano] = useState(false)
  const [formProvaNova, setFormProvaNova] = useState(provaNovaVazia)
  const [formAtividadeNova, setFormAtividadeNova] = useState(atividadeNovaVazia)

  const [formProva, setFormProva] = useState(provaVazia)
  const [salvandoProva, setSalvandoProva] = useState(false)
  const [formAtividade, setFormAtividade] = useState(atividadeVazia)
  const [salvandoAtividade, setSalvandoAtividade] = useState(false)
  const [formRegistro, setFormRegistro] = useState(registroVazio)
  const [conteudoEditado, setConteudoEditado] = useState<string | null>(null)
  const [salvandoRegistro, setSalvandoRegistro] = useState(false)

  // As turmas chegam da API de forma assíncrona — se a página monta antes
  // da primeira turma carregar, escolhe a turma inicial assim que chegar.
  useEffect(() => {
    if (!turmaFiltro && turmas.length > 0) {
      setTurmaFiltro(turmaInicial(turmas))
    }
  }, [turmas, turmaFiltro])

  const turmaAtual = turmas.find((t) => t.id === turmaFiltro) ?? null

  function sistemaDaTurma(turmaId: string): SistemaPeriodo {
    return turmas.find((t) => t.id === turmaId)?.sistemaPeriodo ?? 'semestre'
  }

  const planosDaTurma = useMemo(
    () =>
      planosDeAula
        .filter((p) => p.turmaId === turmaFiltro)
        .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)),
    [planosDeAula, turmaFiltro],
  )

  // Agrupa pra deixar claro na lista quais planos valem agora, quais
  // ainda vão começar e quais já encerraram.
  const gruposDePlanos = useMemo(() => {
    const hoje = hojeISO()
    return {
      ativos: planosDaTurma.filter((p) => p.dataInicio <= hoje && hoje <= p.dataFim),
      futuros: planosDaTurma.filter((p) => p.dataInicio > hoje),
      encerrados: planosDaTurma.filter((p) => p.dataFim < hoje),
    }
  }, [planosDaTurma])

  const selecionado = planosDeAula.find((p) => p.id === selecionadoId) ?? null

  const conteudoAtual = conteudoEditado ?? selecionado?.conteudo ?? ''

  const provasDoPlano = useMemo(
    () =>
      selecionado
        ? eventos
            .filter((e) => e.planoId === selecionado.id && e.tipo === 'prova')
            .sort((a, b) => a.data.localeCompare(b.data))
        : [],
    [eventos, selecionado],
  )

  const atividadesDoPlano = useMemo(
    () =>
      selecionado
        ? eventos
            .filter((e) => e.planoId === selecionado.id && e.tipo === 'trabalho')
            .sort((a, b) => a.data.localeCompare(b.data))
        : [],
    [eventos, selecionado],
  )

  const registrosDoPlano = useMemo(
    () =>
      selecionado
        ? registrosAula
            .filter((r) => r.planoId === selecionado.id)
            .sort((a, b) => a.data.localeCompare(b.data))
        : [],
    [registrosAula, selecionado],
  )

  const conteudoSujo =
    conteudoEditado !== null && conteudoEditado !== (selecionado?.conteudo ?? '')

  // Avisa antes de fechar/recarregar a aba com conteúdo não salvo.
  useEffect(() => {
    if (!conteudoSujo) return
    const aoFechar = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', aoFechar)
    return () => window.removeEventListener('beforeunload', aoFechar)
  }, [conteudoSujo])

  function podeTrocarConteudo(): boolean {
    if (!conteudoSujo) return true
    return confirm('Você tem alterações não salvas no conteúdo previsto. Sair mesmo assim?')
  }

  function trocarTurma(id: string) {
    if (id === turmaFiltro || !podeTrocarConteudo()) return
    setTurmaFiltro(id)
    setSelecionadoId(null)
    setConteudoEditado(null)
    setDrawer(null)
  }

  function abrirVisualizacao(id: string) {
    if (drawer === 'ver' && id === selecionadoId) return
    if (!podeTrocarConteudo()) return
    setSelecionadoId(id)
    setConteudoEditado(null)
    setFormProva(provaVazia())
    setFormAtividade(atividadeVazia())
    setFormRegistro(registroVazio())
    setAbaVer('conteudo')
    setDrawer('ver')
  }

  function fecharDrawer() {
    if (!podeTrocarConteudo()) return
    setDrawer(null)
  }

  function abrirNovo() {
    if (!podeTrocarConteudo()) return
    setConteudoEditado(null)
    setEditando(null)
    setErroForm('')
    setForm({ ...planoVazio(), turmaId: turmaFiltro })
    setFormProvaNova(provaNovaVazia())
    setFormAtividadeNova(atividadeNovaVazia())
    setDrawer('form')
  }

  function abrirEdicao(p: PlanoDeAula) {
    if (!podeTrocarConteudo()) return
    setConteudoEditado(null)
    setEditando(p)
    setErroForm('')
    setForm({
      titulo: p.titulo,
      turmaId: p.turmaId,
      duracao: p.duracao,
      dataInicio: p.dataInicio,
      dataFim: p.dataFim,
      conteudo: p.conteudo ?? '',
    })
    setDrawer('form')
  }

  function mudarDuracao(duracao: DuracaoPlano) {
    setForm((f) => ({
      ...f,
      duracao,
      dataFim: duracao === 'personalizado' ? f.dataFim : adicionarDias(f.dataInicio, DURACAO_DIAS[duracao]),
    }))
  }

  function mudarDataInicio(dataInicio: string) {
    setForm((f) => ({
      ...f,
      dataInicio,
      dataFim: f.duracao === 'personalizado' ? f.dataFim : adicionarDias(dataInicio, DURACAO_DIAS[f.duracao]),
    }))
  }

  async function salvarPlano() {
    if (!form.titulo.trim()) {
      setErroForm('Informe o título do plano.')
      return
    }
    if (!form.turmaId) {
      setErroForm('Escolha a turma.')
      return
    }
    if (!form.dataInicio || !form.dataFim) {
      setErroForm('Informe as datas de início e término.')
      return
    }
    if (form.dataFim < form.dataInicio) {
      setErroForm('A data de término não pode ser antes da data de início.')
      return
    }
    if (formProvaNova.ativo && (!formProvaNova.titulo.trim() || !formProvaNova.data)) {
      setErroForm('Preencha o título e a data da prova, ou desmarque essa opção.')
      return
    }
    if (formAtividadeNova.ativo && (!formAtividadeNova.titulo.trim() || !formAtividadeNova.data)) {
      setErroForm('Preencha o título e a data da atividade, ou desmarque essa opção.')
      return
    }
    setErroForm('')
    const dados = {
      titulo: form.titulo.trim(),
      turmaId: form.turmaId,
      duracao: form.duracao,
      dataInicio: form.dataInicio,
      dataFim: form.dataFim,
      conteudo: form.conteudo.trim() || undefined,
    }
    setSalvandoPlano(true)
    try {
      let planoId = editando?.id ?? ''
      if (editando) {
        await atualizarPlanoDeAula(editando.id, dados)
        notificar('Plano atualizado.')
      } else {
        const criado = await criarPlanoDeAula(dados)
        planoId = criado.id
        notificar('Plano de aula criado.')

        if (formProvaNova.ativo) {
          try {
            await criarEvento({
              titulo: formProvaNova.titulo.trim(),
              tipo: 'prova',
              data: formProvaNova.data,
              turmaId: dados.turmaId,
              planoId: criado.id,
              conteudo: formProvaNova.conteudo.trim() || undefined,
            })
          } catch {
            // erro já notificado pelo DataContext
          }
          criarAvaliacao({
            turmaId: dados.turmaId,
            nome: formProvaNova.titulo.trim(),
            peso: Number(formProvaNova.peso) || 1,
            periodo: formProvaNova.periodo,
          })
        }
        if (formAtividadeNova.ativo) {
          try {
            await criarEvento({
              titulo: formAtividadeNova.titulo.trim(),
              tipo: 'trabalho',
              data: formAtividadeNova.data,
              turmaId: dados.turmaId,
              planoId: criado.id,
              prazo: formAtividadeNova.prazo || undefined,
            })
          } catch {
            // erro já notificado pelo DataContext
          }
          criarAvaliacao({
            turmaId: dados.turmaId,
            nome: formAtividadeNova.titulo.trim(),
            peso: Number(formAtividadeNova.peso) || 1,
            periodo: formAtividadeNova.periodo,
          })
        }
      }
      // Se o plano foi salvo numa turma diferente da que está filtrada
      // agora, troca o filtro — senão ele "some" da tela sem aviso.
      if (dados.turmaId !== turmaFiltro) {
        setTurmaFiltro(dados.turmaId)
      }
      setConteudoEditado(null)
      setFormProva(provaVazia())
      setFormAtividade(atividadeVazia())
      setFormRegistro(registroVazio())
      setSelecionadoId(planoId)
      setAbaVer('conteudo')
      setDrawer('ver')
    } catch {
      // erro já notificado pelo DataContext
    } finally {
      setSalvandoPlano(false)
    }
  }

  function excluirPlano(p: PlanoDeAula) {
    if (confirm(`Excluir o plano "${p.titulo}"? As provas e registros ligados a ele deixam de estar vinculados, mas não são apagados.`)) {
      removerPlanoDeAula(p.id)
      if (selecionadoId === p.id) {
        setSelecionadoId(null)
        setConteudoEditado(null)
        setDrawer(null)
      }
    }
  }

  function salvarConteudo() {
    if (!selecionado) return
    atualizarPlanoDeAula(selecionado.id, { conteudo: conteudoAtual.trim() || undefined })
    setConteudoEditado(null)
    notificar('Conteúdo salvo.')
  }

  async function adicionarProva() {
    if (!selecionado) return
    if (!formProva.titulo.trim() || !formProva.data) return
    setSalvandoProva(true)
    try {
      await criarEvento({
        titulo: formProva.titulo.trim(),
        tipo: 'prova',
        data: formProva.data,
        turmaId: selecionado.turmaId,
        planoId: selecionado.id,
        conteudo: formProva.conteudo.trim() || undefined,
      })
      criarAvaliacao({
        turmaId: selecionado.turmaId,
        nome: formProva.titulo.trim(),
        peso: Number(formProva.peso) || 1,
        periodo: formProva.periodo,
      })
      notificar('Prova adicionada — também aparece na Agenda e em Notas.')
      setFormProva(provaVazia())
    } catch {
      // erro já notificado pelo DataContext
    } finally {
      setSalvandoProva(false)
    }
  }

  function excluirProva(id: string) {
    if (confirm('Excluir esta prova? Ela também some da Agenda.')) removerEvento(id)
  }

  async function adicionarAtividade() {
    if (!selecionado) return
    if (!formAtividade.titulo.trim() || !formAtividade.data) return
    setSalvandoAtividade(true)
    try {
      await criarEvento({
        titulo: formAtividade.titulo.trim(),
        tipo: 'trabalho',
        data: formAtividade.data,
        turmaId: selecionado.turmaId,
        planoId: selecionado.id,
        prazo: formAtividade.prazo || undefined,
      })
      criarAvaliacao({
        turmaId: selecionado.turmaId,
        nome: formAtividade.titulo.trim(),
        peso: Number(formAtividade.peso) || 1,
        periodo: formAtividade.periodo,
      })
      notificar('Atividade adicionada — também aparece na Agenda e em Notas.')
      setFormAtividade(atividadeVazia())
    } catch {
      // erro já notificado pelo DataContext
    } finally {
      setSalvandoAtividade(false)
    }
  }

  function excluirAtividade(id: string) {
    if (confirm('Excluir esta atividade? Ela também some da Agenda.')) removerEvento(id)
  }

  async function salvarRegistro() {
    if (!selecionado || !formRegistro.resumo.trim() || !formRegistro.data) return
    setSalvandoRegistro(true)
    try {
      await definirRegistroAula(selecionado.turmaId, formRegistro.data, formRegistro.resumo.trim(), selecionado.id)
      notificar('Registro da aula salvo.')
      setFormRegistro(registroVazio())
    } catch {
      // erro já notificado pelo DataContext
    } finally {
      setSalvandoRegistro(false)
    }
  }

  function renderCartaoPlano(p: PlanoDeAula) {
    const encerrado = p.dataFim < hojeISO()
    const resumo = p.conteudo ? resumoTexto(p.conteudo) : ''
    return (
      <article
        key={p.id}
        className={`evento-cartao plano-cartao-linha ${encerrado ? 'plano-encerrado' : ''}`}
        onClick={() => abrirVisualizacao(p.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            abrirVisualizacao(p.id)
          }
        }}
      >
        <div className="evento-cartao-barra" style={{ background: turmaAtual?.cor }} />
        <div className="evento-cartao-data">
          <span className="dia">{p.dataInicio.split('-')[2]}</span>
          <span className="mes">{mesAbrev(p.dataInicio)}</span>
        </div>
        <div className="evento-cartao-corpo">
          <div className="evento-cartao-topo">
            <span className="evento-tag" style={{ background: turmaAtual?.cor }}>
              {ROTULO_DURACAO[p.duracao]}
            </span>
            {encerrado && <span className="pill pill-sem-nota">Encerrado</span>}
          </div>
          <h3>{p.titulo}</h3>
          {resumo && <p className="evento-conteudo">{resumo}</p>}
          <span className="evento-data-completa">
            {formatarData(p.dataInicio)} — {formatarData(p.dataFim)}
          </span>
        </div>
      </article>
    )
  }

  if (turmas.length === 0) {
    return (
      <div className="stack-lg">
        <header className="pagina-head">
          <div>
            <h1>Plano de aula</h1>
          </div>
        </header>
        <div className="vazio painel">
          <p>Cadastre uma turma primeiro para criar um plano de aula.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Plano de aula</h1>
          <p className="pagina-sub">
            Planeje o conteúdo de cada turma, cadastre provas e registre o que foi aplicado em cada aula.
          </p>
        </div>
        <button className="btn btn-primario" onClick={abrirNovo}>
          Novo plano
        </button>
      </header>

      <div className="barra-config">
        <label className="campo-inline">
          <span>Turma</span>
          <select className="select" value={turmaFiltro} onChange={(e) => trocarTurma(e.target.value)}>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} — {t.escola}
              </option>
            ))}
          </select>
        </label>
      </div>

      {planosDaTurma.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhum plano de aula para esta turma ainda.</p>
          <button className="btn btn-primario" onClick={abrirNovo}>
            Criar plano de aula
          </button>
        </div>
      ) : (
        <div className="stack-lg">
          {gruposDePlanos.ativos.length > 0 && (
            <div className="stack-md">
              <span className="lista-planos-grupo-titulo">Ativos agora</span>
              <div className="timeline">{gruposDePlanos.ativos.map(renderCartaoPlano)}</div>
            </div>
          )}
          {gruposDePlanos.futuros.length > 0 && (
            <div className="stack-md">
              <span className="lista-planos-grupo-titulo">Futuros</span>
              <div className="timeline">{gruposDePlanos.futuros.map(renderCartaoPlano)}</div>
            </div>
          )}
          {gruposDePlanos.encerrados.length > 0 && (
            <div className="stack-md">
              <span className="lista-planos-grupo-titulo">Encerrados</span>
              <div className="timeline">{gruposDePlanos.encerrados.map(renderCartaoPlano)}</div>
            </div>
          )}
        </div>
      )}

      <Drawer
        aberto={drawer === 'ver' && selecionado != null}
        titulo={selecionado?.titulo ?? ''}
        onFechar={fecharDrawer}
      >
        {selecionado && (
          <div className="stack-md">
            <div className="painel-head">
              <span className="texto-suave">
                {turmaAtual?.nome} · {ROTULO_DURACAO[selecionado.duracao]} ·{' '}
                {formatarData(selecionado.dataInicio)} até {formatarData(selecionado.dataFim)}
              </span>
              <div className="grupo-botoes">
                <button className="btn btn-fantasma btn-pequeno" onClick={() => abrirEdicao(selecionado)}>
                  Editar
                </button>
                <button
                  className="btn btn-perigo-fantasma btn-pequeno"
                  onClick={() => excluirPlano(selecionado)}
                >
                  Excluir
                </button>
              </div>
            </div>

            <div className="abas">
              <button
                className={`aba ${abaVer === 'conteudo' ? 'ativa' : ''}`}
                onClick={() => setAbaVer('conteudo')}
              >
                Conteúdo
              </button>
              <button
                className={`aba ${abaVer === 'provas' ? 'ativa' : ''}`}
                onClick={() => setAbaVer('provas')}
              >
                Provas {provasDoPlano.length > 0 && `(${provasDoPlano.length})`}
              </button>
              <button
                className={`aba ${abaVer === 'atividades' ? 'ativa' : ''}`}
                onClick={() => setAbaVer('atividades')}
              >
                Atividades {atividadesDoPlano.length > 0 && `(${atividadesDoPlano.length})`}
              </button>
              <button
                className={`aba ${abaVer === 'registro' ? 'ativa' : ''}`}
                onClick={() => setAbaVer('registro')}
              >
                Registro de aula
              </button>
            </div>

            {abaVer === 'conteudo' && (
              <div>
                <h3 className="titulo-secao">Conteúdo previsto</h3>
                <EditorRico
                  key={selecionado.id}
                  value={conteudoAtual}
                  onChange={setConteudoEditado}
                  placeholder="Tópicos e conteúdos que pretende dar neste plano..."
                />
                {conteudoSujo && (
                  <div className="acoes-fim">
                    <span className="texto-suave aviso-nao-salvo">Alterações não salvas</span>
                    <button className="btn btn-primario btn-pequeno" onClick={salvarConteudo}>
                      Salvar conteúdo
                    </button>
                  </div>
                )}
              </div>
            )}

            {abaVer === 'provas' && (
              <div>
                <h3 className="titulo-secao">Provas deste plano</h3>
                {provasDoPlano.length === 0 ? (
                  <p className="texto-suave">Nenhuma prova cadastrada ainda.</p>
                ) : (
                  <ul className="lista-simples">
                    {provasDoPlano.map((e) => (
                      <li key={e.id}>
                        <span>
                          <strong>{formatarData(e.data)}</strong> — {e.titulo}
                        </span>
                        <button className="icon-btn" aria-label="Excluir prova" onClick={() => excluirProva(e.id)}>
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <hr className="divisor" />

                <h3 className="titulo-secao">Nova prova</h3>
                <div className="form-grid form-grid-compacto">
                  <label className="campo">
                    <span>Título da prova</span>
                    <input
                      value={formProva.titulo}
                      onChange={(e) => setFormProva((f) => ({ ...f, titulo: e.target.value }))}
                      placeholder="Ex.: Prova de frações"
                    />
                  </label>
                  <label className="campo">
                    <span>Data</span>
                    <input
                      type="date"
                      value={formProva.data}
                      onChange={(e) => setFormProva((f) => ({ ...f, data: e.target.value }))}
                    />
                  </label>
                  <label className="campo">
                    <span>Período</span>
                    <select
                      className="select"
                      value={formProva.periodo}
                      onChange={(e) => setFormProva((f) => ({ ...f, periodo: e.target.value as Periodo }))}
                    >
                      {opcoesPeriodo(sistemaDaTurma(selecionado.turmaId)).map((op) => (
                        <option key={op.valor} value={op.valor}>
                          {op.rotulo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="campo">
                    <span>Peso na média</span>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={formProva.peso}
                      onChange={(e) => setFormProva((f) => ({ ...f, peso: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="campo campo-espacosa">
                  <span>Conteúdo cobrado (opcional)</span>
                  <EditorRico
                    value={formProva.conteudo}
                    onChange={(html) => setFormProva((f) => ({ ...f, conteudo: html }))}
                    placeholder="Assuntos que serão cobrados na prova..."
                  />
                </div>
                <p className="texto-suave">
                  Vira automaticamente uma coluna de avaliação em Notas — só falta lançar a nota de cada aluno lá.
                </p>
                <div className="acoes-fim">
                  <button
                    className="btn btn-fantasma btn-pequeno"
                    onClick={adicionarProva}
                    disabled={salvandoProva}
                  >
                    {salvandoProva ? 'Adicionando...' : '+ Adicionar prova'}
                  </button>
                </div>
              </div>
            )}

            {abaVer === 'atividades' && (
              <div>
                <h3 className="titulo-secao">Atividades deste plano</h3>
                {atividadesDoPlano.length === 0 ? (
                  <p className="texto-suave">Nenhuma atividade cadastrada ainda.</p>
                ) : (
                  <ul className="lista-simples">
                    {atividadesDoPlano.map((e) => (
                      <li key={e.id}>
                        <span>
                          <strong>{formatarData(e.data)}</strong> — {e.titulo}
                          {e.prazo && <> · prazo {formatarData(e.prazo)}</>}
                        </span>
                        <button
                          className="icon-btn"
                          aria-label="Excluir atividade"
                          onClick={() => excluirAtividade(e.id)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <hr className="divisor" />

                <h3 className="titulo-secao">Nova atividade</h3>
                <div className="form-grid form-grid-compacto">
                  <label className="campo campo-largo">
                    <span>Título da atividade</span>
                    <input
                      value={formAtividade.titulo}
                      onChange={(e) => setFormAtividade((f) => ({ ...f, titulo: e.target.value }))}
                      placeholder="Ex.: Lista de exercícios de frações"
                    />
                  </label>
                  <label className="campo">
                    <span>Data</span>
                    <input
                      type="date"
                      value={formAtividade.data}
                      onChange={(e) => setFormAtividade((f) => ({ ...f, data: e.target.value }))}
                    />
                  </label>
                  <label className="campo">
                    <span>Prazo de entrega</span>
                    <input
                      type="date"
                      value={formAtividade.prazo}
                      onChange={(e) => setFormAtividade((f) => ({ ...f, prazo: e.target.value }))}
                    />
                  </label>
                  <label className="campo">
                    <span>Período</span>
                    <select
                      className="select"
                      value={formAtividade.periodo}
                      onChange={(e) =>
                        setFormAtividade((f) => ({ ...f, periodo: e.target.value as Periodo }))
                      }
                    >
                      {opcoesPeriodo(sistemaDaTurma(selecionado.turmaId)).map((op) => (
                        <option key={op.valor} value={op.valor}>
                          {op.rotulo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="campo">
                    <span>Peso na média</span>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={formAtividade.peso}
                      onChange={(e) => setFormAtividade((f) => ({ ...f, peso: e.target.value }))}
                    />
                  </label>
                </div>
                <p className="texto-suave">
                  Vira automaticamente uma coluna de avaliação em Notas — só falta lançar a nota de cada aluno lá.
                </p>
                <div className="acoes-fim">
                  <button
                    className="btn btn-fantasma btn-pequeno"
                    onClick={adicionarAtividade}
                    disabled={salvandoAtividade}
                  >
                    {salvandoAtividade ? 'Adicionando...' : '+ Adicionar atividade'}
                  </button>
                </div>
              </div>
            )}

            {abaVer === 'registro' && (
              <div>
                <h3 className="titulo-secao">O que foi aplicado em cada aula</h3>
                {registrosDoPlano.length === 0 ? (
                  <p className="texto-suave">
                    Nenhuma aula registrada ainda. Você também pode registrar direto na tela de Frequência.
                  </p>
                ) : (
                  <ul className="lista-simples">
                    {registrosDoPlano.map((r) => (
                      <li key={r.id}>
                        <span>
                          <strong>{formatarData(r.data)}</strong> — {resumoTexto(r.resumo)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <hr className="divisor" />

                <h3 className="titulo-secao">Novo registro</h3>
                <label className="campo campo-data-curta">
                  <span>Data</span>
                  <input
                    type="date"
                    value={formRegistro.data}
                    onChange={(e) => setFormRegistro((f) => ({ ...f, data: e.target.value }))}
                  />
                </label>
                <div className="campo campo-espacosa">
                  <span>O que foi aplicado</span>
                  <EditorRico
                    value={formRegistro.resumo}
                    onChange={(html) => setFormRegistro((f) => ({ ...f, resumo: html }))}
                    placeholder="Resumo do que foi dado nesse dia..."
                  />
                </div>
                <div className="acoes-fim">
                  <button
                    className="btn btn-fantasma btn-pequeno"
                    onClick={salvarRegistro}
                    disabled={salvandoRegistro}
                  >
                    {salvandoRegistro ? 'Salvando...' : '+ Registrar aula'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Drawer
        aberto={drawer === 'form'}
        titulo={editando ? 'Editar plano de aula' : 'Novo plano de aula'}
        onFechar={() => setDrawer(editando ? 'ver' : null)}
        rodape={
          <>
            <button className="btn btn-fantasma" onClick={() => setDrawer(editando ? 'ver' : null)}>
              Cancelar
            </button>
            <button className="btn btn-primario" onClick={salvarPlano} disabled={salvandoPlano}>
              {salvandoPlano ? 'Salvando...' : editando ? 'Salvar' : 'Criar plano'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label className="campo campo-largo">
            <span>Título do plano</span>
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex.: Frações — 1º bimestre"
              autoFocus
            />
          </label>
          <label className="campo">
            <span>Turma</span>
            <select
              className="select"
              value={form.turmaId}
              onChange={(e) => setForm({ ...form, turmaId: e.target.value })}
            >
              <option value="">— Selecione —</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} — {t.escola}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Duração</span>
            <select
              className="select"
              value={form.duracao}
              onChange={(e) => mudarDuracao(e.target.value as DuracaoPlano)}
            >
              <option value="quinzenal">Quinzenal</option>
              <option value="semestral">Semestral</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </label>
          <label className="campo">
            <span>Data de início</span>
            <input type="date" value={form.dataInicio} onChange={(e) => mudarDataInicio(e.target.value)} />
          </label>
          <label className="campo">
            <span>Até quando vale</span>
            <input
              type="date"
              value={form.dataFim}
              disabled={form.duracao !== 'personalizado'}
              onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
            />
          </label>
          <div className="campo campo-largo">
            <span>Conteúdo previsto (opcional)</span>
            <EditorRico
              value={form.conteudo}
              onChange={(html) => setForm((f) => ({ ...f, conteudo: html }))}
              placeholder="Tópicos que pretende cobrir nesse período..."
            />
          </div>
        </div>

        {!editando && (
          <>
            <hr className="divisor" />

            <label className="campo-checkbox">
              <input
                type="checkbox"
                checked={formAtividadeNova.ativo}
                onChange={(e) =>
                  setFormAtividadeNova((f) => ({ ...f, ativo: e.target.checked }))
                }
              />
              <span>Este plano já tem uma atividade marcada</span>
            </label>
            {formAtividadeNova.ativo && (
              <div className="form-grid form-grid-compacto">
                <label className="campo campo-largo">
                  <span>Título da atividade</span>
                  <input
                    value={formAtividadeNova.titulo}
                    onChange={(e) =>
                      setFormAtividadeNova((f) => ({ ...f, titulo: e.target.value }))
                    }
                    placeholder="Ex.: Lista de exercícios de frações"
                  />
                </label>
                <label className="campo">
                  <span>Data</span>
                  <input
                    type="date"
                    value={formAtividadeNova.data}
                    onChange={(e) => setFormAtividadeNova((f) => ({ ...f, data: e.target.value }))}
                  />
                </label>
                <label className="campo">
                  <span>Prazo de entrega</span>
                  <input
                    type="date"
                    value={formAtividadeNova.prazo}
                    onChange={(e) =>
                      setFormAtividadeNova((f) => ({ ...f, prazo: e.target.value }))
                    }
                  />
                </label>
                <label className="campo">
                  <span>Período</span>
                  <select
                    className="select"
                    value={formAtividadeNova.periodo}
                    onChange={(e) =>
                      setFormAtividadeNova((f) => ({ ...f, periodo: e.target.value as Periodo }))
                    }
                  >
                    {opcoesPeriodo(sistemaDaTurma(form.turmaId)).map((op) => (
                      <option key={op.valor} value={op.valor}>
                        {op.rotulo}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="campo">
                  <span>Peso na média</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formAtividadeNova.peso}
                    onChange={(e) => setFormAtividadeNova((f) => ({ ...f, peso: e.target.value }))}
                  />
                </label>
              </div>
            )}

            <hr className="divisor" />

            <label className="campo-checkbox">
              <input
                type="checkbox"
                checked={formProvaNova.ativo}
                onChange={(e) => setFormProvaNova((f) => ({ ...f, ativo: e.target.checked }))}
              />
              <span>Este plano já tem uma prova marcada</span>
            </label>
            {formProvaNova.ativo && (
              <div className="form-grid form-grid-compacto">
                <label className="campo campo-largo">
                  <span>Título da prova</span>
                  <input
                    value={formProvaNova.titulo}
                    onChange={(e) => setFormProvaNova((f) => ({ ...f, titulo: e.target.value }))}
                    placeholder="Ex.: Prova de frações"
                  />
                </label>
                <label className="campo">
                  <span>Data da prova</span>
                  <input
                    type="date"
                    value={formProvaNova.data}
                    onChange={(e) => setFormProvaNova((f) => ({ ...f, data: e.target.value }))}
                  />
                </label>
                <label className="campo">
                  <span>Período</span>
                  <select
                    className="select"
                    value={formProvaNova.periodo}
                    onChange={(e) =>
                      setFormProvaNova((f) => ({ ...f, periodo: e.target.value as Periodo }))
                    }
                  >
                    {opcoesPeriodo(sistemaDaTurma(form.turmaId)).map((op) => (
                      <option key={op.valor} value={op.valor}>
                        {op.rotulo}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="campo">
                  <span>Peso na média</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formProvaNova.peso}
                    onChange={(e) => setFormProvaNova((f) => ({ ...f, peso: e.target.value }))}
                  />
                </label>
                <div className="campo campo-largo">
                  <span>Conteúdo cobrado (opcional)</span>
                  <EditorRico
                    value={formProvaNova.conteudo}
                    onChange={(html) => setFormProvaNova((f) => ({ ...f, conteudo: html }))}
                    placeholder="Assuntos que serão cobrados na prova..."
                  />
                </div>
              </div>
            )}
            <p className="texto-suave">
              Prova e atividade marcadas aqui também aparecem na Agenda e já viram uma coluna de
              avaliação em Notas. Dá pra adicionar mais depois, direto na tela do plano.
            </p>
          </>
        )}

        {erroForm && <div className="alerta-erro">{erroForm}</div>}
      </Drawer>
    </div>
  )
}
