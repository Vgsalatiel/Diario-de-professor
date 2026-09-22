import { useMemo, type ReactNode } from 'react'
import { useData } from '../context/DataContext'
import { chaveEntrega } from '../lib/entregas'
import type { StatusEntrega } from '../types'

const ROTULO_STATUS: Record<StatusEntrega, string> = {
  feito: 'Feito',
  pendente: 'Pendente',
  naoEntregou: 'Não entregou',
}

const OPCOES: StatusEntrega[] = ['feito', 'pendente', 'naoEntregou']

// Lista dos alunos da turma com o status de entrega de uma prova/atividade
// (Evento) — usado tanto na Agenda (antes de concluir) quanto no Histórico
// (depois de concluído, pra corrigir entrega atrasada).
export function EntregasEvento({
  eventoId,
  turmaId,
  rotulo,
}: {
  eventoId: string
  turmaId: string
  rotulo?: ReactNode
}) {
  const { alunos, entregas, definirEntrega } = useData()

  const alunosDaTurma = useMemo(
    () =>
      alunos
        .filter((a) => a.turmaId === turmaId && a.situacao === 'ativo')
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    [alunos, turmaId],
  )

  if (alunosDaTurma.length === 0) return null

  const feitos = alunosDaTurma.filter(
    (a) => entregas[chaveEntrega(a.id, eventoId)] === 'feito',
  ).length

  return (
    <details className="entrega-detalhe">
      <summary>
        {rotulo ?? <span className="texto-suave">Controle de entregas</span>}
        <span className="texto-suave">
          {feitos}/{alunosDaTurma.length} entregaram
        </span>
      </summary>
      <ul className="lista-entregas">
        {alunosDaTurma.map((aluno) => {
          const status = entregas[chaveEntrega(aluno.id, eventoId)] ?? 'pendente'
          return (
            <li key={aluno.id} className="linha-entrega">
              <span>{aluno.nome}</span>
              <div className="grupo-status-entrega">
                {OPCOES.map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    className={`status-entrega-btn status-${opcao} ${status === opcao ? 'ativo' : ''}`}
                    onClick={() => definirEntrega(aluno.id, eventoId, opcao)}
                  >
                    {ROTULO_STATUS[opcao]}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
