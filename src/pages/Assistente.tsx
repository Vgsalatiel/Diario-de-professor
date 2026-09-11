import { useState, type ChangeEvent } from 'react'
import { imprimirHTML } from '../lib/export'
import {
  gerarCorrecaoSimulada,
  gerarExercicioSimulado,
  gerarHTMLExercicio,
  type ResultadoCorrecao,
  type ResultadoExercicio,
} from '../lib/assistenteIA'

export function Assistente() {
  const [aba, setAba] = useState<'corrigir' | 'gerar'>('corrigir')

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
            Protótipo — os resultados abaixo são simulados, sem chamada a
            nenhuma IA real ainda.
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
      </div>

      {aba === 'corrigir' ? (
        <div className="grid-perfil">
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
      ) : (
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
    </div>
  )
}
