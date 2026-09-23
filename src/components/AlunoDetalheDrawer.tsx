import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { pillFrequencia } from '../pages/Admin'
import { Drawer } from './Drawer'
import type { AlunoDetalheCoordenacao } from '../types'

// A pill de frequência do aluno (pillFrequencia) já sinaliza abaixo de
// 75% em vermelho — esse ⚠️ extra é só um alerta prévio pra faixa logo
// acima disso (75–84%), pra chamar atenção antes de virar um problema
// mais sério.
function alertaFrequenciaAluno(percentual: number | null): string {
  if (percentual == null) return ''
  return percentual >= 75 && percentual < 85 ? ' ⚠️' : ''
}

interface AlunoDetalheDrawerProps {
  // null = fechado. Buscar os dados é responsabilidade do próprio drawer —
  // quem usa só precisa passar o id do aluno clicado.
  alunoId: string | null
  onFechar: () => void
}

// Detalhe individual do aluno — frequência, desempenho por matéria,
// observações pedagógicas e o histórico de acompanhamento (com campo pra
// registrar uma entrada nova). Usado tanto pela Coordenação quanto pela
// Administração (o(a) diretor(a) já enxerga o que a coordenação vê).
export function AlunoDetalheDrawer({ alunoId, onFechar }: AlunoDetalheDrawerProps) {
  const { notificar } = useToast()
  const [dados, setDados] = useState<AlunoDetalheCoordenacao | null>(null)
  const [novoTexto, setNovoTexto] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!alunoId) {
      setDados(null)
      return
    }
    setDados(null)
    setNovoTexto('')
    api
      .get<AlunoDetalheCoordenacao>(`/coordenacao/alunos/${alunoId}`)
      .then(setDados)
      .catch((e) => notificar(e instanceof ApiError ? e.message : 'Não foi possível abrir esse aluno.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alunoId])

  async function adicionarAcompanhamento() {
    if (!dados || !novoTexto.trim()) return
    setSalvando(true)
    try {
      const atualizado = await api.post<AlunoDetalheCoordenacao>(
        `/coordenacao/alunos/${dados.id}/acompanhamento`,
        { texto: novoTexto.trim() },
      )
      setDados(atualizado)
      setNovoTexto('')
    } catch (e) {
      notificar(e instanceof ApiError ? e.message : 'Não foi possível salvar o acompanhamento.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Drawer aberto={!!alunoId} titulo={dados?.nome ?? 'Carregando...'} onFechar={onFechar}>
      {!dados && <p className="texto-suave">Carregando...</p>}
      {dados && (
        <div className="stack-md">
          <p className="texto-suave">
            {dados.turmaNome}
            {dados.situacao !== 'ativo' && ` · ${dados.situacao}`}
          </p>

          <div>
            <h3 className="titulo-secao">Frequência</h3>
            <p>
              {pillFrequencia(dados.frequenciaPercentual)}
              {alertaFrequenciaAluno(dados.frequenciaPercentual)}
            </p>
          </div>

          <div>
            <h3 className="titulo-secao">Desempenho</h3>
            {dados.desempenho.length === 0 ? (
              <p className="texto-suave">Nenhuma nota lançada ainda.</p>
            ) : (
              <ul className="lista-simples">
                {dados.desempenho.map((d, i) => (
                  <li key={`${d.turmaId}-${d.materia}-${i}`}>
                    <span>{d.materia}</span>
                    <span className="texto-suave">
                      {d.media == null ? 'Sem notas lançadas' : String(d.media).replace('.', ',')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="titulo-secao">Observações pedagógicas</h3>
            <p className="texto-suave">{dados.dificuldades || 'Nenhuma registrada.'}</p>
          </div>

          <div>
            <h3 className="titulo-secao">Acompanhamento</h3>
            {dados.acompanhamentos.length === 0 ? (
              <p className="texto-suave">Nenhum acompanhamento registrado ainda.</p>
            ) : (
              <ul className="lista-simples">
                {dados.acompanhamentos.map((a) => (
                  <li key={a.id}>
                    <span>{a.texto}</span>
                    <span className="texto-suave">
                      {new Date(a.criadoEm).toLocaleDateString('pt-BR')} · {a.autorNome}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <label className="campo campo-largo">
              <span>Novo acompanhamento</span>
              <textarea
                rows={3}
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                placeholder="Ex.: Professor relatou dificuldade em matemática."
              />
            </label>
            <button
              className="btn btn-primario btn-pequeno"
              onClick={adicionarAcompanhamento}
              disabled={salvando || !novoTexto.trim()}
            >
              {salvando ? 'Salvando...' : '+ Adicionar ao histórico'}
            </button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
