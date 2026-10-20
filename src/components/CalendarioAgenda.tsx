import { useMemo } from 'react'
import type { Evento, Feriado } from '../types'
import { corTipo, rotuloTipo } from '../lib/eventos'
import { hojeISO } from '../lib/data'
import { diaPorExtenso, nomeDoMes, semanasDoMes, somarMeses } from '../lib/calendario'

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
// Quantos eventos cabem no quadrado antes de virar "+N".
const MAX_NO_DIA = 3

interface CalendarioAgendaProps {
  mes: string // "AAAA-MM"
  onMudarMes: (mes: string) => void
  eventos: Evento[]
  feriados: Feriado[]
  onAdicionar: (data: string) => void
  onAbrirEvento: (evento: Evento) => void
  onAbrirDia: (data: string) => void
  somenteLeitura: boolean
}

// Toque sem mouse (celular/tablet): não existe "passar o mouse", então
// tocar no dia abre a janela do dia, com os eventos e o "+ Adicionar".
const semHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

export function CalendarioAgenda({
  mes,
  onMudarMes,
  eventos,
  feriados,
  onAdicionar,
  onAbrirEvento,
  onAbrirDia,
  somenteLeitura,
}: CalendarioAgendaProps) {
  const semanas = useMemo(() => semanasDoMes(mes), [mes])
  const hoje = hojeISO()

  const porDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>()
    for (const e of eventos) {
      const lista = mapa.get(e.data) ?? []
      lista.push(e)
      mapa.set(e.data, lista)
    }
    for (const lista of mapa.values()) lista.sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''))
    return mapa
  }, [eventos])

  const feriadoDoDia = useMemo(() => new Map(feriados.map((f) => [f.data, f.titulo])), [feriados])

  return (
    <section className="calendario painel" aria-label={`Calendário de ${nomeDoMes(mes)}`}>
      <div className="calendario-topo">
        <button
          type="button"
          className="icon-btn"
          onClick={() => onMudarMes(somarMeses(mes, -1))}
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <h2 className="calendario-mes" aria-live="polite">
          {nomeDoMes(mes)}
        </h2>
        <button
          type="button"
          className="icon-btn"
          onClick={() => onMudarMes(somarMeses(mes, 1))}
          aria-label="Próximo mês"
        >
          ›
        </button>
        {mes !== hoje.slice(0, 7) && (
          <button type="button" className="btn btn-fantasma btn-pequeno" onClick={() => onMudarMes(hoje.slice(0, 7))}>
            Hoje
          </button>
        )}
      </div>

      <div className="calendario-grade" role="grid" aria-readonly={somenteLeitura}>
        <div className="calendario-linha" role="row">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="calendario-cab" role="columnheader">
              {d}
            </div>
          ))}
        </div>
        {semanas.map((semana) => (
          <div key={semana[0].data} className="calendario-linha" role="row">
            {semana.map((d) => {
              const feriado = feriadoDoDia.get(d.data)
              const doDia = porDia.get(d.data) ?? []
              const extenso = diaPorExtenso(d.data)
              const classes = [
                'calendario-dia',
                d.doMes ? '' : 'fora-do-mes',
                feriado ? 'feriado' : '',
                d.data === hoje ? 'hoje' : '',
              ].join(' ')
              return (
                <div
                  key={d.data}
                  role="gridcell"
                  className={classes}
                  aria-label={feriado ? `${extenso}: ${feriado}, sem aula` : undefined}
                  onClick={() => {
                    // No celular, tocar em qualquer parte do dia abre o dia.
                    if (feriado || !semHover()) return
                    onAbrirDia(d.data)
                  }}
                >
                  <div className="calendario-dia-topo">
                    {feriado ? (
                      <span className="calendario-num">{d.dia}</span>
                    ) : (
                      <button
                        type="button"
                        className="calendario-num"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          onAbrirDia(d.data)
                        }}
                        aria-label={`Ver ${extenso}${doDia.length ? `, ${doDia.length} evento(s)` : ''}`}
                      >
                        {d.dia}
                      </button>
                    )}
                    {!feriado && !somenteLeitura && (
                      <button
                        type="button"
                        className="calendario-add"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          onAdicionar(d.data)
                        }}
                        aria-label={`Adicionar evento em ${extenso}`}
                        title="Adicionar evento"
                      >
                        +
                      </button>
                    )}
                  </div>
                  {feriado && <span className="calendario-feriado">{feriado}</span>}
                  {doDia.slice(0, MAX_NO_DIA).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      className={`calendario-evento ${e.concluido ? 'concluido' : ''}`}
                      style={{ borderLeftColor: corTipo(e.tipo) }}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        onAbrirEvento(e)
                      }}
                      aria-label={`${rotuloTipo(e.tipo)}: ${e.titulo}${e.hora ? `, ${e.hora}` : ''}${e.concluido ? ', concluído' : ''}`}
                    >
                      <span className="calendario-evento-ponto" style={{ background: corTipo(e.tipo) }} aria-hidden />
                      <span className="calendario-evento-texto">
                        {e.hora && <strong>{e.hora} </strong>}
                        {e.titulo}
                      </span>
                    </button>
                  ))}
                  {doDia.length > MAX_NO_DIA && (
                    <button
                      type="button"
                      className="calendario-mais"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        onAbrirDia(d.data)
                      }}
                    >
                      +{doDia.length - MAX_NO_DIA} mais
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="calendario-legenda" aria-hidden>
        {(['prova', 'trabalho', 'reuniao', 'outro'] as const).map((t) => (
          <span key={t}>
            <i style={{ background: corTipo(t) }} /> {rotuloTipo(t)}
          </span>
        ))}
        <span>
          <i className="legenda-feriado" /> Feriado / sem aula
        </span>
      </div>
    </section>
  )
}
