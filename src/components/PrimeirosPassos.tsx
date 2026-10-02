import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useTour } from './Tour'

interface Etapa {
  titulo: string
  feita: boolean
  acao: { rotulo: string; para: string }
  // Etapa anterior que precisa estar feita (índice) e o aviso enquanto não está.
  requer?: number
  depoisDe?: string
}

function lerEstado(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

function gravarEstado(chave: string, valor: string): void {
  try {
    localStorage.setItem(chave, valor)
  } catch {
    // armazenamento indisponível — o cartão só volta a aparecer
  }
}

// Guia do primeiro uso no Início: cada etapa se marca sozinha a partir dos
// dados do professor, e só a próxima pendente fica em destaque.
export function PrimeirosPassos() {
  const { professora } = useAuth()
  const { turmas, alunos, notas, conceitos, frequencia } = useData()
  const { iniciarTour } = useTour()
  const chave = `diario:primeiros-passos:${professora.id}`
  const [estado, setEstado] = useState(() => lerEstado(chave))

  const etapas: Etapa[] = [
    {
      titulo: 'Crie sua primeira turma',
      feita: turmas.length > 0,
      acao: { rotulo: 'Criar turma', para: '/turmas?novo=1' },
    },
    {
      titulo: 'Cadastre ou importe seus alunos',
      feita: alunos.length > 0,
      acao: { rotulo: 'Adicionar alunos', para: '/alunos?novo=1' },
      requer: 0,
      depoisDe: 'Depois de criar a turma',
    },
    {
      titulo: 'Crie uma avaliação e lance as notas',
      feita: [...Object.values(notas), ...Object.values(conceitos)].some((v) => v != null),
      acao: { rotulo: 'Ir para Notas', para: '/notas' },
      requer: 1,
      depoisDe: 'Depois de cadastrar os alunos',
    },
    {
      titulo: 'Faça a primeira chamada',
      feita: Object.values(frequencia).some((v) => v != null),
      acao: { rotulo: 'Ir para Presença', para: '/frequencia' },
      requer: 1,
      depoisDe: 'Depois de cadastrar os alunos',
    },
  ]
  const feitas = etapas.filter((e) => e.feita).length
  const todasFeitas = feitas === etapas.length
  // Notas e chamada não dependem uma da outra, só de já ter alunos — as
  // duas ficam liberadas juntas; só a primeira liberada fica em destaque.
  const liberada = (e: Etapa) => !e.feita && (e.requer === undefined || etapas[e.requer].feita)
  const proxima = etapas.findIndex(liberada)

  // Lembra que o professor já viu o guia incompleto — assim o "Tudo
  // pronto!" só aparece pra quem passou pelas etapas, e não pra quem já
  // usava o sistema antes do guia existir.
  useEffect(() => {
    if (!todasFeitas && estado === null) {
      gravarEstado(chave, 'em-andamento')
      setEstado('em-andamento')
    }
  }, [todasFeitas, estado, chave])

  function ocultar() {
    gravarEstado(chave, 'oculto')
    setEstado('oculto')
  }

  if (estado === 'oculto' || (todasFeitas && estado !== 'em-andamento')) return null

  if (todasFeitas) {
    return (
      <section className="painel primeiros-passos">
        <div className="painel-head">
          <h2>Tudo pronto! 🎉</h2>
          <button className="link-botao" onClick={ocultar}>
            Fechar
          </button>
        </div>
        <p className="texto-suave">
          Sua turma está montada. Daqui pra frente, o Início mostra seus compromissos e o que
          precisa de atenção. Quando quiser, experimente montar um{' '}
          <Link to="/plano-de-aula" className="link-acao">
            plano de aula com a IA
          </Link>
          .
        </p>
      </section>
    )
  }

  return (
    <section className="painel primeiros-passos" aria-labelledby="primeiros-passos-titulo">
      <div className="painel-head">
        <h2 id="primeiros-passos-titulo">Primeiros passos</h2>
        <span className="texto-suave">
          {feitas} de {etapas.length}
        </span>
      </div>
      <div
        className="primeiros-passos-barra"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={etapas.length}
        aria-valuenow={feitas}
        aria-label="Progresso dos primeiros passos"
      >
        <span style={{ width: `${(feitas / etapas.length) * 100}%` }} />
      </div>
      <ol className="primeiros-passos-lista">
        {etapas.map((etapa, i) => {
          const disponivel = liberada(etapa)
          return (
            <li key={etapa.titulo} className={etapa.feita ? 'feita' : disponivel ? 'atual' : 'futura'}>
              <span className="primeiros-passos-marca" aria-hidden>
                {etapa.feita ? '✓' : i + 1}
              </span>
              <span className="primeiros-passos-texto">
                {etapa.titulo}
                {etapa.feita && <span className="sr-only"> (feito)</span>}
              </span>
              {disponivel && (
                <Link
                  to={etapa.acao.para}
                  className={`btn btn-pequeno ${i === proxima ? 'btn-primario' : 'btn-fantasma'}`}
                >
                  {etapa.acao.rotulo}
                </Link>
              )}
              {!etapa.feita && !disponivel && etapa.depoisDe && (
                <span className="texto-suave primeiros-passos-depois">{etapa.depoisDe}</span>
              )}
            </li>
          )
        })}
      </ol>
      <div className="primeiros-passos-rodape">
        <span className="texto-suave">
          Opcional:{' '}
          <Link to="/plano-de-aula" className="link-acao">
            monte um plano de aula com a IA
          </Link>
        </span>
        <span className="primeiros-passos-links">
          <button className="link-botao" onClick={iniciarTour}>
            Fazer o tour
          </button>
          <button className="link-botao" onClick={ocultar}>
            Não mostrar mais
          </button>
        </span>
      </div>
    </section>
  )
}
