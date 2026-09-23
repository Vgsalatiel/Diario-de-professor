import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { formatarData } from '../lib/eventos'
import { Drawer } from './Drawer'
import type { ProfessorDetalheCoordenacao, ObservacaoPedagogica, TipoObservacao } from '../types'

function ratioTexto(feitas: number, esperadas: number): string {
  return `${feitas}/${esperadas}`
}

function badgeObservacao(o: ObservacaoPedagogica) {
  if (o.tipo !== 'solicitacaoCorrecao') return null
  return (
    <span className={`pill ${o.resolvida ? 'pill-aprovado' : 'pill-recuperacao'}`}>
      {o.resolvida ? 'Correção resolvida' : 'Pede correção'}
    </span>
  )
}

interface ProfessorDetalheDrawerProps {
  professorId: string | null
  onFechar: () => void
  // Só a coordenação pode deixar comentário/solicitar correção — o(a)
  // diretor(a) acompanha e administra, não interage com o trabalho
  // pedagógico do professor. Sem esse callback, os botões nem aparecem.
  onAbrirObservacao?: (professorAlvoId?: string, tipo?: TipoObservacao, texto?: string) => void
  // Muda depois de salvar uma observação pra esse professor — força
  // recarregar o detalhe (a lista de observações mudou), mesmo com o
  // mesmo professorId ainda aberto.
  chaveRecarga?: number
}

// Detalhe de um professor — turmas, disciplinas, proporção de registros
// (aulas/frequência/avaliações), pendências, planejamento recente, alunos
// com dificuldade e observações já trocadas. Usado pela Coordenação (com
// os botões de comentário/solicitar correção) e pela Administração (só
// leitura).
export function ProfessorDetalheDrawer({
  professorId,
  onFechar,
  onAbrirObservacao,
  chaveRecarga,
}: ProfessorDetalheDrawerProps) {
  const { notificar } = useToast()
  const [dados, setDados] = useState<ProfessorDetalheCoordenacao | null>(null)

  useEffect(() => {
    if (!professorId) {
      setDados(null)
      return
    }
    api
      .get<ProfessorDetalheCoordenacao>(`/coordenacao/professores/${professorId}`)
      .then(setDados)
      .catch((e) => notificar(e instanceof ApiError ? e.message : 'Não foi possível abrir esse professor.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professorId, chaveRecarga])

  return (
    <Drawer aberto={!!professorId} titulo={dados?.nome ?? 'Carregando...'} onFechar={onFechar}>
      {!dados && <p className="texto-suave">Carregando...</p>}
      {dados && (
        <div className="stack-md">
          <p className="texto-suave">{dados.email}</p>

          <div>
            <h3 className="titulo-secao">Turmas</h3>
            {dados.turmas.length === 0 ? (
              <p className="texto-suave">Nenhuma turma.</p>
            ) : (
              <ul className="lista-simples">
                {dados.turmas.map((t) => (
                  <li key={t.id}>
                    <span>{t.nome}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="titulo-secao">Disciplinas</h3>
            {dados.materias.length === 0 ? (
              <p className="texto-suave">Nenhuma matéria definida.</p>
            ) : (
              <ul className="lista-simples">
                {dados.materias.map((m) => (
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
                  {ratioTexto(dados.registros.aulas.feitas, dados.registros.aulas.esperadas)}
                </span>
              </li>
              <li>
                <span>Frequência</span>
                <span className="texto-suave">
                  {ratioTexto(dados.registros.frequencia.feitas, dados.registros.frequencia.esperadas)}
                </span>
              </li>
              <li>
                <span>Avaliações</span>
                <span className="texto-suave">
                  {ratioTexto(dados.registros.avaliacoes.feitas, dados.registros.avaliacoes.esperadas)}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="titulo-secao">Pendências</h3>
            {dados.pendencias.length === 0 ? (
              <p className="texto-suave">Nenhuma pendência. 🎉</p>
            ) : (
              <ul className="lista-marcada">
                {dados.pendencias.map((texto) => (
                  <li key={texto}>
                    <span>{texto}</span>
                    {onAbrirObservacao && (
                      <>
                        {' '}
                        <button
                          className="link-botao"
                          onClick={() =>
                            onAbrirObservacao(
                              dados.id,
                              'solicitacaoCorrecao',
                              `Poderia corrigir: ${texto.charAt(0).toLowerCase()}${texto.slice(1)}?`,
                            )
                          }
                        >
                          Solicitar correção
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="titulo-secao">Planejamento recente</h3>
            {dados.planosDeAula.length === 0 ? (
              <p className="texto-suave">Nenhum plano de aula cadastrado.</p>
            ) : (
              <ul className="lista-simples">
                {dados.planosDeAula.map((p) => (
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
            {dados.alunosComDificuldade.length === 0 ? (
              <p className="texto-suave">Nenhuma registrada.</p>
            ) : (
              <ul className="lista-simples">
                {dados.alunosComDificuldade.map((a) => (
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
            {dados.observacoes.length === 0 ? (
              <p className="texto-suave">Nenhuma observação ainda.</p>
            ) : (
              <ul className="lista-simples">
                {dados.observacoes.map((o) => (
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
            {onAbrirObservacao && (
              <div className="grupo-botoes">
                <button className="btn btn-fantasma" onClick={() => onAbrirObservacao(dados.id)}>
                  + Comentário
                </button>
                <button
                  className="btn btn-fantasma"
                  onClick={() => onAbrirObservacao(dados.id, 'solicitacaoCorrecao')}
                >
                  + Solicitar correção
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}
