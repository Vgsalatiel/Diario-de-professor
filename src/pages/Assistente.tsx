import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useData } from '../context/DataContext'
import { imprimirHTML } from '../lib/export'
import type { ExercicioGerado } from '../types'
import {
  gerarCorrecaoSimulada,
  gerarExercicioSimulado,
  gerarHTMLExercicio,
  type ResultadoCorrecao,
  type ResultadoExercicio,
} from '../lib/assistenteIA'

function formatarDataSimples(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR')
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Assistente() {
  const { alunos, gerarExerciciosPersonalizados, listarExerciciosGerados } = useData()
  const [aba, setAba] = useState<'corrigir' | 'gerar' | 'personalizado'>('corrigir')

  const alunosOrdenados = useMemo(
    () => [...alunos].sort((a, b) => a.nome.localeCompare(b.nome)),
    [alunos],
  )

  const [alunoId, setAlunoId] = useState('')
  const [assunto, setAssunto] = useState('')
  const [dificuldade, setDificuldade] = useState('')
  const [quantidade, setQuantidade] = useState(5)
  const [nomeProva, setNomeProva] = useState('')
  const [dataProva, setDataProva] = useState('')
  const [gerandoPersonalizado, setGerandoPersonalizado] = useState(false)
  const [erroPersonalizado, setErroPersonalizado] = useState('')
  const [exercicioPersonalizado, setExercicioPersonalizado] = useState<ExercicioGerado | null>(
    null,
  )
  const [mostrarGabaritoPersonalizado, setMostrarGabaritoPersonalizado] = useState(false)

  const [historico, setHistorico] = useState<ExercicioGerado[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const [historicoExpandidoId, setHistoricoExpandidoId] = useState<string | null>(null)

  useEffect(() => {
    if (!alunoId) {
      setHistorico([])
      return
    }
    setCarregandoHistorico(true)
    listarExerciciosGerados(alunoId)
      .then(setHistorico)
      .catch(() => {
        // erro já notificado pelo DataContext
      })
      .finally(() => setCarregandoHistorico(false))
  }, [alunoId, listarExerciciosGerados])

  function selecionarAluno(id: string) {
    setAlunoId(id)
    const aluno = alunos.find((a) => a.id === id)
    setDificuldade(aluno?.dificuldades ?? '')
    setNomeProva('')
    setDataProva('')
    setExercicioPersonalizado(null)
    setHistoricoExpandidoId(null)
  }

  async function gerarPersonalizado() {
    if (!alunoId || !assunto.trim()) return
    setErroPersonalizado('')
    setGerandoPersonalizado(true)
    setExercicioPersonalizado(null)
    setMostrarGabaritoPersonalizado(false)
    try {
      const resultado = await gerarExerciciosPersonalizados(alunoId, {
        assunto: assunto.trim(),
        dificuldade: dificuldade.trim() || undefined,
        quantidade,
        nomeProva: nomeProva.trim() || undefined,
        dataProva: dataProva || undefined,
      })
      setExercicioPersonalizado(resultado)
      setHistorico((h) => [resultado, ...h])
    } catch {
      setErroPersonalizado('Não foi possível gerar os exercícios agora. Tente de novo.')
    } finally {
      setGerandoPersonalizado(false)
    }
  }

  function baixarExercicioPersonalizado() {
    if (!exercicioPersonalizado) return
    imprimirHTML(gerarHTMLExercicio(exercicioPersonalizado))
  }

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [analisando, setAnalisando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoCorrecao | null>(null)

  const [pedido, setPedido] = useState('')
  const [gerando, setGerando] = useState(false)
  const [exercicio, setExercicio] = useState<ResultadoExercicio | null>(null)
  const [mostrarGabarito, setMostrarGabarito] = useState(false)

  function onArquivo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setResultado(null)
    setArquivo(file)
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setPreviewUrl(String(reader.result))
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl('')
    }
  }

  function analisar() {
    if (!arquivo) return
    setAnalisando(true)
    setResultado(null)
    setTimeout(() => {
      setResultado(gerarCorrecaoSimulada(arquivo.name, arquivo.size))
      setAnalisando(false)
    }, 1100)
  }

  function gerar() {
    if (!pedido.trim()) return
    setGerando(true)
    setExercicio(null)
    setMostrarGabarito(false)
    setTimeout(() => {
      setExercicio(gerarExercicioSimulado(pedido.trim()))
      setGerando(false)
    }, 900)
  }

  function baixarExercicio() {
    if (!exercicio) return
    imprimirHTML(gerarHTMLExercicio(exercicio))
  }

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Assistente de IA</h1>
          <p className="pagina-sub">
            "Corrigir" e "Criar exercício" ainda são protótipos simulados —
            "Exercício personalizado" já usa IA de verdade.
          </p>
        </div>
      </header>

      <div className="abas">
        <button
          className={`aba ${aba === 'corrigir' ? 'ativa' : ''}`}
          onClick={() => setAba('corrigir')}
        >
          Corrigir exercício
        </button>
        <button
          className={`aba ${aba === 'gerar' ? 'ativa' : ''}`}
          onClick={() => setAba('gerar')}
        >
          Criar exercício
        </button>
        <button
          className={`aba ${aba === 'personalizado' ? 'ativa' : ''}`}
          onClick={() => setAba('personalizado')}
        >
          Exercício personalizado
        </button>
      </div>

      {aba === 'corrigir' ? (
        <div className="grid-perfil grid-perfil-media">
          <section className="painel">
            <h2>Enviar exercício</h2>
            <p className="texto-suave">
              Envie uma foto ou arquivo da atividade do aluno para simular uma
              correção.
            </p>
            <div className="form-grid">
              <label className="campo campo-largo">
                <span>Arquivo ou foto</span>
                <input
                  type="file"
                  accept="image/*,.pdf,.txt"
                  capture="environment"
                  onChange={onArquivo}
                />
              </label>
            </div>

            {previewUrl && (
              <img
                src={previewUrl}
                alt="Pré-visualização do exercício"
                className="assistente-preview"
              />
            )}

            <div className="acoes-fim">
              <button
                className="btn btn-primario"
                onClick={analisar}
                disabled={!arquivo || analisando}
              >
                {analisando ? 'Analisando…' : 'Analisar'}
              </button>
            </div>
          </section>

          <section className="painel">
            <h2>Resultado</h2>
            {!arquivo && !resultado && !analisando && (
              <p className="texto-suave">
                Em desenvolvimento
              </p>
            )}
            {analisando && <p className="texto-suave">Analisando o exercício…</p>}
            {resultado && (
              <div className="stack-md">
                <div className="assistente-nota">
                  <strong>{resultado.notaEstimada.toFixed(1)}</strong>
                  <span>Nota estimada</span>
                </div>

                <div>
                  <h3 className="titulo-secao">Pontos fortes</h3>
                  <ul className="lista-marcada">
                    {resultado.pontosFortes.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="titulo-secao">Pontos de atenção</h3>
                  <ul className="lista-marcada">
                    {resultado.pontosAtencao.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>

                <p className="texto-suave">{resultado.comentario}</p>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {aba === 'gerar' && (
        <div className="grid-perfil">
          <section className="painel">
            <h2>O que você precisa?</h2>
            <div className="form-grid">
              <label className="campo campo-largo">
                <span>Descreva o exercício</span>
                <textarea
                  rows={4}
                  value={pedido}
                  onChange={(e) => setPedido(e.target.value)}
                  placeholder="Ex.: 5 questões sobre frações para o 6º ano, nível médio"
                />
              </label>
            </div>
            <div className="acoes-fim">
              <button
                className="btn btn-primario"
                onClick={gerar}
                disabled={!pedido.trim() || gerando}
              >
                {gerando ? 'Gerando…' : 'Gerar exercício'}
              </button>
            </div>
          </section>

          <section className="painel">
            <h2>Exercício gerado</h2>
            {!exercicio && !gerando && (
              <p className="texto-suave">
                Descreva o que precisa ao lado e clique em “Gerar exercício”.
              </p>
            )}
            {gerando && <p className="texto-suave">Gerando questões…</p>}
            {exercicio && (
              <div className="stack-md">
                <ol className="lista-exercicio">
                  {exercicio.questoes.map((q, i) => (
                    <li key={i}>{q.enunciado}</li>
                  ))}
                </ol>

                <button
                  className="btn btn-fantasma btn-pequeno"
                  onClick={() => setMostrarGabarito((v) => !v)}
                >
                  {mostrarGabarito ? 'Esconder gabarito' : 'Mostrar gabarito'}
                </button>

                {mostrarGabarito && (
                  <ol className="lista-exercicio">
                    {exercicio.questoes.map((q, i) => (
                      <li key={i}>{q.gabarito}</li>
                    ))}
                  </ol>
                )}

                <div className="acoes-fim">
                  <button className="btn btn-fantasma" onClick={baixarExercicio}>
                    Baixar em PDF
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {aba === 'personalizado' && (
        <div className="stack-lg">
        <div className="grid-perfil grid-perfil-largo">
          <section className="painel">
            <h2>Exercício personalizado</h2>
            <p className="texto-suave">
              Gera uma lista de exercícios sob medida pro aluno, com base no assunto e na
              observação de dificuldade/facilidade dele.
            </p>
            <div className="form-grid">
              <label className="campo campo-largo">
                <span>Aluno</span>
                <select
                  className="select"
                  value={alunoId}
                  onChange={(e) => selecionarAluno(e.target.value)}
                >
                  <option value="">— Selecione —</option>
                  {alunosOrdenados.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo campo-largo">
                <span>Assunto</span>
                <input
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  placeholder="Ex.: frações, verbos irregulares em inglês"
                />
              </label>
              <label className="campo campo-largo">
                <span>Dificuldade/facilidade do aluno</span>
                <textarea
                  rows={3}
                  value={dificuldade}
                  onChange={(e) => setDificuldade(e.target.value)}
                  placeholder="Ex.: tem dificuldade em somar frações com denominadores diferentes, mas vai bem em multiplicação"
                />
                <p className="texto-suave">
                  Vem preenchido com a observação salva no cadastro do aluno — dá pra editar só
                  pra essa geração, sem alterar o cadastro.
                </p>
              </label>
              <label className="campo">
                <span>Quantidade de questões</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value) || 1)}
                />
              </label>
              <label className="campo">
                <span>Nome da prova (opcional)</span>
                <input
                  value={nomeProva}
                  onChange={(e) => setNomeProva(e.target.value)}
                  placeholder="Ex.: Prova bimestral de Matemática"
                />
              </label>
              <label className="campo">
                <span>Data da prova (opcional)</span>
                <input
                  type="date"
                  value={dataProva}
                  onChange={(e) => setDataProva(e.target.value)}
                />
              </label>
            </div>
            {erroPersonalizado && <div className="alerta-erro">{erroPersonalizado}</div>}
            <div className="acoes-fim">
              <button
                className="btn btn-primario"
                onClick={gerarPersonalizado}
                disabled={!alunoId || !assunto.trim() || gerandoPersonalizado}
              >
                {gerandoPersonalizado ? 'Gerando…' : 'Gerar exercícios com IA'}
              </button>
            </div>
          </section>

          <section className="painel">
            <h2>Exercícios gerados</h2>
            {!exercicioPersonalizado && !gerandoPersonalizado && (
              <p className="texto-suave">
                Escolha o aluno e o assunto ao lado e clique em "Gerar exercícios com IA".
              </p>
            )}
            {gerandoPersonalizado && (
              <p className="texto-suave">Gerando questões personalizadas…</p>
            )}
            {exercicioPersonalizado && (
              <div className="stack-md">
                <h3 className="titulo-secao">{exercicioPersonalizado.titulo}</h3>
                {(exercicioPersonalizado.nomeProva || exercicioPersonalizado.dataProva) && (
                  <p className="texto-suave">
                    {exercicioPersonalizado.nomeProva && (
                      <strong>{exercicioPersonalizado.nomeProva}</strong>
                    )}
                    {exercicioPersonalizado.nomeProva && exercicioPersonalizado.dataProva && ' — '}
                    {exercicioPersonalizado.dataProva &&
                      formatarDataSimples(exercicioPersonalizado.dataProva)}
                  </p>
                )}
                <ol className="lista-exercicio">
                  {exercicioPersonalizado.questoes.map((q, i) => (
                    <li key={i}>{q.enunciado}</li>
                  ))}
                </ol>

                <button
                  className="btn btn-fantasma btn-pequeno"
                  onClick={() => setMostrarGabaritoPersonalizado((v) => !v)}
                >
                  {mostrarGabaritoPersonalizado ? 'Esconder gabarito' : 'Mostrar gabarito'}
                </button>

                {mostrarGabaritoPersonalizado && (
                  <ol className="lista-exercicio">
                    {exercicioPersonalizado.questoes.map((q, i) => (
                      <li key={i}>{q.gabarito}</li>
                    ))}
                  </ol>
                )}

                <div className="acoes-fim">
                  <button className="btn btn-fantasma" onClick={baixarExercicioPersonalizado}>
                    Baixar em PDF
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="painel">
          <h2>Histórico deste aluno</h2>
          {!alunoId && <p className="texto-suave">Escolha um aluno pra ver o histórico dele.</p>}
          {alunoId && carregandoHistorico && (
            <p className="texto-suave">Carregando histórico…</p>
          )}
          {alunoId && !carregandoHistorico && historico.length === 0 && (
            <p className="texto-suave">Nenhuma lista gerada ainda pra esse aluno.</p>
          )}
          {historico.length > 0 && (
            <ul className="lista-simples">
              {historico.map((item) => {
                const aberto = historicoExpandidoId === item.id
                return (
                  <li key={item.id} className="historico-exercicio-item">
                    <button
                      type="button"
                      className="historico-exercicio-cabecalho"
                      onClick={() => setHistoricoExpandidoId(aberto ? null : item.id)}
                    >
                      <span>
                        <strong>{item.assunto}</strong>
                        {item.nomeProva && <> · {item.nomeProva}</>}
                        {item.dataProva && <> ({formatarDataSimples(item.dataProva)})</>}
                        {' — '}
                        {formatarDataHora(item.criadoEm)}
                      </span>
                      <span aria-hidden>{aberto ? '▲' : '▼'}</span>
                    </button>
                    {aberto && (
                      <div className="stack-md">
                        <h3 className="titulo-secao">{item.titulo}</h3>
                        <ol className="lista-exercicio">
                          {item.questoes.map((q, i) => (
                            <li key={i}>
                              {q.enunciado}
                              <br />
                              <em className="texto-suave">Gabarito: {q.gabarito}</em>
                            </li>
                          ))}
                        </ol>
                        <div className="acoes-fim">
                          <button
                            className="btn btn-fantasma btn-pequeno"
                            onClick={() =>
                              imprimirHTML(
                                gerarHTMLExercicio({
                                  titulo: item.titulo,
                                  questoes: item.questoes,
                                }),
                              )
                            }
                          >
                            Baixar em PDF
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        </div>
      )}
    </div>
  )
}
