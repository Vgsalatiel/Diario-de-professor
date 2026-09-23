import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAnoLetivo } from '../context/AnoLetivoContext'
import type { Turno } from '../types'

const ROTULO_TURNO: Record<Turno, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }

function diasAulaResumo(dias: number[]): string {
  const DIAS_SEMANA = [
    { valor: 1, rotulo: 'Seg' },
    { valor: 2, rotulo: 'Ter' },
    { valor: 3, rotulo: 'Qua' },
    { valor: 4, rotulo: 'Qui' },
    { valor: 5, rotulo: 'Sex' },
    { valor: 6, rotulo: 'Sáb' },
  ]
  if (dias.length === 0) return 'Nenhum dia definido'
  if (dias.length === 5 && [1, 2, 3, 4, 5].every((d) => dias.includes(d))) {
    return 'Segunda a sexta'
  }
  return DIAS_SEMANA.filter((d) => dias.includes(d.valor))
    .map((d) => d.rotulo)
    .join(', ')
}

// Turmas são da escola, não do professor — quem cria/edita/atribui
// professores é a coordenação (ver Coordenacao.tsx). Aqui é só a lista
// somente-leitura das turmas em que o professor logado dá aula.
export function Turmas() {
  const { turmas, alunos } = useData()
  const { anoAtivo } = useAnoLetivo()
  const [escolaFiltro, setEscolaFiltro] = useState('todas')

  const turmasDoAno = useMemo(
    () => turmas.filter((t) => t.anoLetivo === anoAtivo),
    [turmas, anoAtivo],
  )

  const escolas = useMemo(
    () =>
      Array.from(new Set(turmasDoAno.map((t) => t.escola).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [turmasDoAno],
  )

  const turmasFiltradas = useMemo(
    () =>
      escolaFiltro === 'todas'
        ? turmasDoAno
        : turmasDoAno.filter((t) => t.escola === escolaFiltro),
    [turmasDoAno, escolaFiltro],
  )

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Turmas</h1>
          <p className="pagina-sub">
            Turmas são criadas e mantidas pela coordenação — aqui você vê as turmas em que dá
            aula.
          </p>
        </div>
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

      {turmasDoAno.length === 0 ? (
        <div className="vazio painel">
          <p>Nenhuma turma atribuída a você no ano letivo {anoAtivo}.</p>
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
                  {t.disciplina && <p className="texto-suave">Sua disciplina: {t.disciplina}</p>}
                  <p className="texto-suave">{diasAulaResumo(t.diasAula)}</p>
                  <div className="card-turma-meta">
                    <span>{total} alunos</span>
                    <span>·</span>
                    <span>{t.anoLetivo}</span>
                    {t.turno && (
                      <>
                        <span>·</span>
                        <span>{ROTULO_TURNO[t.turno]}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="card-turma-acoes">
                  <Link to={`/alunos?turma=${t.id}`} className="btn btn-fantasma btn-pequeno">
                    Ver alunos
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
