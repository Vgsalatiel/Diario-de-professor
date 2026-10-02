import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'

interface ParadaTour {
  para: string // rota do item do menu (bate com data-tour no NavLink)
  titulo: string
  texto: string
}

const PARADAS: ParadaTour[] = [
  {
    para: '/turmas',
    titulo: 'Turmas',
    texto: 'Comece por aqui: crie uma turma para cada classe em que você dá aula.',
  },
  {
    para: '/alunos',
    titulo: 'Alunos',
    texto: 'Cadastre os alunos de cada turma, um por um ou importando uma planilha do Excel.',
  },
  {
    para: '/notas',
    titulo: 'Notas',
    texto: 'Crie as avaliações (provas, trabalhos) e lance as notas. A média sai sozinha.',
  },
  {
    para: '/frequencia',
    titulo: 'Presença',
    texto: 'Faça a chamada do dia: um toque no aluno marca presença, outro marca falta.',
  },
  {
    para: '/plano-de-aula',
    titulo: 'Plano de aula',
    texto: 'Planeje o conteúdo do período. Se quiser, a IA monta o cronograma pela BNCC.',
  },
  {
    para: '/agenda',
    titulo: 'Agenda',
    texto: 'Provas, trabalhos, reuniões e feriados num só lugar, com aviso por e-mail.',
  },
  {
    para: '/assistente',
    titulo: 'Assistente IA',
    texto: 'Gere exercícios personalizados para um aluno a partir das dificuldades dele.',
  },
]

const TourContext = createContext<{ iniciarTour: () => void }>({ iniciarTour: () => {} })

export const TourProvider = TourContext.Provider

// Pra qualquer tela abrir o tour (ex.: link "Fazer o tour" dos Primeiros passos).
export function useTour() {
  return useContext(TourContext)
}

export function chaveTourVisto(professorId: string): string {
  return `diario:tour:${professorId}`
}

interface Posicao {
  alvo: DOMRect
  balao: { top: number; left: number; width?: number }
}

const CELULAR = '(max-width: 760px)'

// Tour pelo menu: destaca o item real (o resto da tela escurece) e mostra
// um balão ao lado — embaixo, no celular — explicando pra que serve.
export function Tour({
  aberto,
  onFechar,
  definirMenuAberto,
}: {
  aberto: boolean
  onFechar: () => void
  definirMenuAberto: (aberto: boolean) => void
}) {
  const [indice, setIndice] = useState(0)
  const [posicao, setPosicao] = useState<Posicao | null>(null)
  const balaoRef = useRef<HTMLDivElement>(null)
  const parada = PARADAS[indice]

  const fechar = useCallback(() => {
    definirMenuAberto(false)
    setIndice(0)
    onFechar()
  }, [definirMenuAberto, onFechar])

  const medir = useCallback(() => {
    const alvo = document.querySelector<HTMLElement>(`[data-tour="${parada.para}"]`)
    const balao = balaoRef.current
    if (!alvo) return
    const r = alvo.getBoundingClientRect()
    const altura = balao?.offsetHeight ?? 180
    const margem = 12
    if (window.matchMedia(CELULAR).matches) {
      const cabeEmbaixo = r.bottom + margem + altura < window.innerHeight
      setPosicao({
        alvo: r,
        balao: {
          top: cabeEmbaixo ? r.bottom + margem : Math.max(margem, r.top - margem - altura),
          left: margem,
          width: window.innerWidth - margem * 2,
        },
      })
    } else {
      setPosicao({
        alvo: r,
        balao: {
          top: Math.min(Math.max(margem, r.top - 12), window.innerHeight - altura - margem),
          left: r.right + 16,
        },
      })
    }
  }, [parada.para])

  // No celular o menu fica escondido: abre durante o tour. A posição é
  // medida de novo depois da animação de abrir o menu.
  useLayoutEffect(() => {
    if (!aberto) return
    if (window.matchMedia(CELULAR).matches) definirMenuAberto(true)
    document.querySelector(`[data-tour="${parada.para}"]`)?.scrollIntoView({ block: 'nearest' })
    medir()
    const t = window.setTimeout(medir, 260)
    return () => window.clearTimeout(t)
  }, [aberto, parada.para, medir, definirMenuAberto])

  useEffect(() => {
    if (!aberto) return
    window.addEventListener('resize', medir)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
      if (e.key === 'ArrowRight') setIndice((i) => Math.min(i + 1, PARADAS.length - 1))
      if (e.key === 'ArrowLeft') setIndice((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', medir)
      window.removeEventListener('keydown', onKey)
    }
  }, [aberto, medir, fechar])

  // Leva o foco pro balão a cada parada (leitor de tela anuncia o texto).
  useEffect(() => {
    if (aberto) balaoRef.current?.focus()
  }, [aberto, indice])

  if (!aberto) return null

  const ultima = indice === PARADAS.length - 1
  const folga = 4

  return (
    <div className="tour">
      {/* Captura cliques fora do balão pra não mexer na tela por baixo. */}
      <div className="tour-bloqueio" />
      {posicao && (
        <div
          className="tour-destaque"
          style={{
            top: posicao.alvo.top - folga,
            left: posicao.alvo.left - folga,
            width: posicao.alvo.width + folga * 2,
            height: posicao.alvo.height + folga * 2,
          }}
        />
      )}
      <div
        ref={balaoRef}
        className="tour-balao"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-titulo"
        aria-describedby="tour-texto"
        tabIndex={-1}
        style={posicao ? posicao.balao : { visibility: 'hidden' }}
      >
        <div className="tour-balao-topo">
          <h2 id="tour-titulo">{parada.titulo}</h2>
          <span className="texto-suave">
            {indice + 1} de {PARADAS.length}
          </span>
        </div>
        <p id="tour-texto">{parada.texto}</p>
        <div className="tour-balao-acoes">
          <button className="link-botao" onClick={fechar}>
            Pular tour
          </button>
          <div className="tour-balao-navegacao">
            {indice > 0 && (
              <button className="btn btn-fantasma btn-pequeno" onClick={() => setIndice((i) => i - 1)}>
                ‹ Voltar
              </button>
            )}
            {ultima ? (
              <button className="btn btn-primario btn-pequeno" onClick={fechar}>
                Concluir
              </button>
            ) : (
              <button className="btn btn-primario btn-pequeno" onClick={() => setIndice((i) => i + 1)}>
                Próximo ›
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
