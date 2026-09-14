import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type {
  Aluno,
  Avaliacao,
  ConfigCalculo,
  DataAula,
  Evento,
  MapaDeFrequencia,
  MapaDeNotas,
  Turma,
} from '../types'
import { usePersistedState, novoId } from '../lib/storage'
import { chaveNota } from '../lib/media'
import { chavePresenca } from '../lib/frequencia'
import { useAuth } from './AuthContext'
import {
  alunosIniciais,
  avaliacoesIniciais,
  configsIniciais,
  datasAulaIniciais,
  eventosIniciais,
  frequenciaIniciais,
  notasIniciais,
  professoraInicial,
  turmasIniciais,
} from '../data/seed'

interface DataContextValue {
  turmas: Turma[]
  alunos: Aluno[]
  avaliacoes: Avaliacao[]
  notas: MapaDeNotas
  configs: ConfigCalculo[]
  eventos: Evento[]

  // Turmas
  criarTurma: (dados: Omit<Turma, 'id'>) => void
  atualizarTurma: (id: string, dados: Partial<Turma>) => void
  removerTurma: (id: string) => void

  // Alunos
  criarAluno: (dados: Omit<Aluno, 'id'>) => void
  atualizarAluno: (id: string, dados: Partial<Aluno>) => void
  removerAluno: (id: string) => void

  // Avaliações
  criarAvaliacao: (dados: Omit<Avaliacao, 'id'>) => void
  atualizarAvaliacao: (id: string, dados: Partial<Avaliacao>) => void
  removerAvaliacao: (id: string) => void

  // Notas
  definirNota: (alunoId: string, avaliacaoId: string, valor: number | null) => void

  // Configuração de cálculo
  configDaTurma: (turmaId: string) => ConfigCalculo
  atualizarConfig: (turmaId: string, dados: Partial<ConfigCalculo>) => void

  // Eventos
  criarEvento: (dados: Omit<Evento, 'id'>) => void
  atualizarEvento: (id: string, dados: Partial<Evento>) => void
  removerEvento: (id: string) => void

  // Frequência
  datasAula: DataAula[]
  frequencia: MapaDeFrequencia
  // Garante que exista uma aula para essa turma/data (cria se faltar) e devolve o id dela
  garantirDataAula: (turmaId: string, data: string, periodo: DataAula['periodo']) => string
  definirPresenca: (alunoId: string, dataAulaId: string, valor: boolean | null) => void
  // Alterna se um dia conta como "sem aula" (não entra na frequência de ninguém)
  alternarSemAula: (turmaId: string, data: string, periodo: DataAula['periodo']) => void
}

const DataContext = createContext<DataContextValue | null>(null)

const CONFIG_PADRAO = (turmaId: string): ConfigCalculo => ({
  turmaId,
  modelo: 'simples',
  mediaAprovacao: 6.0,
})

export function DataProvider({ children }: { children: ReactNode }) {
  const { professora } = useAuth()
  // Só a professora de demonstração (seed) começa com dados de exemplo —
  // qualquer outro professor cadastrado começa do zero.
  const ehContaDemo = professora.id === professoraInicial.id
  const ns = (chave: string) => `${chave}:${professora.id}`
  const vazio = <T,>(cheio: T, v: T): T => (ehContaDemo ? cheio : v)

  const [turmasBrutas, setTurmas] = usePersistedState<Turma[]>(
    ns('turmas'),
    vazio(turmasIniciais, []),
  )
  // Turmas salvas antes do campo "dias de aula" existir não têm esse dado —
  // preenche com segunda a sexta pra não quebrar as telas que dependem dele.
  const turmas = useMemo(
    () =>
      turmasBrutas.map((t) =>
        Array.isArray(t.diasAula) ? t : { ...t, diasAula: [1, 2, 3, 4, 5] },
      ),
    [turmasBrutas],
  )
  const [alunos, setAlunos] = usePersistedState<Aluno[]>(
    ns('alunos'),
    vazio(alunosIniciais, []),
  )
  const [avaliacoes, setAvaliacoes] = usePersistedState<Avaliacao[]>(
    ns('avaliacoes'),
    vazio(avaliacoesIniciais, []),
  )
  const [notas, setNotas] = usePersistedState<MapaDeNotas>(
    ns('notas'),
    vazio(notasIniciais, {}),
  )
  const [configs, setConfigs] = usePersistedState<ConfigCalculo[]>(
    ns('configs'),
    vazio(configsIniciais, []),
  )
  const [eventos, setEventos] = usePersistedState<Evento[]>(
    ns('eventos'),
    vazio(eventosIniciais, []),
  )
  const [datasAula, setDatasAula] = usePersistedState<DataAula[]>(
    ns('datasAula'),
    vazio(datasAulaIniciais, []),
  )
  const [frequencia, setFrequencia] = usePersistedState<MapaDeFrequencia>(
    ns('frequencia'),
    vazio(frequenciaIniciais, {}),
  )

  const value = useMemo<DataContextValue>(() => {
    return {
      turmas,
      alunos,
      avaliacoes,
      notas,
      configs,
      eventos,
      datasAula,
      frequencia,

      criarTurma: (dados) => {
        const id = novoId()
        setTurmas((ts) => [...ts, { ...dados, id }])
        setConfigs((cs) => [...cs, CONFIG_PADRAO(id)])
      },
      atualizarTurma: (id, dados) =>
        setTurmas((ts) => ts.map((t) => (t.id === id ? { ...t, ...dados } : t))),
      removerTurma: (id) => {
        setTurmas((ts) => ts.filter((t) => t.id !== id))
        // remove alunos, avaliações, notas, datas de aula, frequência,
        // config e vínculos de eventos da turma
        const alunosDaTurma = alunos.filter((a) => a.turmaId === id).map((a) => a.id)
        const avalsDaTurma = avaliacoes.filter((a) => a.turmaId === id).map((a) => a.id)
        const datasDaTurma = datasAula.filter((d) => d.turmaId === id).map((d) => d.id)
        setAlunos((as) => as.filter((a) => a.turmaId !== id))
        setAvaliacoes((avs) => avs.filter((a) => a.turmaId !== id))
        setDatasAula((ds) => ds.filter((d) => d.turmaId !== id))
        setConfigs((cs) => cs.filter((c) => c.turmaId !== id))
        setNotas((ns) => {
          const copia = { ...ns }
          for (const k of Object.keys(copia)) {
            const [aId, avId] = k.split('::')
            if (alunosDaTurma.includes(aId) || avalsDaTurma.includes(avId)) {
              delete copia[k]
            }
          }
          return copia
        })
        setFrequencia((fs) => {
          const copia = { ...fs }
          for (const k of Object.keys(copia)) {
            const [aId, dId] = k.split('::')
            if (alunosDaTurma.includes(aId) || datasDaTurma.includes(dId)) {
              delete copia[k]
            }
          }
          return copia
        })
        setEventos((es) =>
          es.map((e) => (e.turmaId === id ? { ...e, turmaId: undefined } : e)),
        )
      },

      criarAluno: (dados) =>
        setAlunos((as) => [...as, { ...dados, id: novoId() }]),
      atualizarAluno: (id, dados) =>
        setAlunos((as) => as.map((a) => (a.id === id ? { ...a, ...dados } : a))),
      removerAluno: (id) => {
        setAlunos((as) => as.filter((a) => a.id !== id))
        setNotas((ns) => {
          const copia = { ...ns }
          for (const k of Object.keys(copia)) {
            if (k.startsWith(`${id}::`)) delete copia[k]
          }
          return copia
        })
        setFrequencia((fs) => {
          const copia = { ...fs }
          for (const k of Object.keys(copia)) {
            if (k.startsWith(`${id}::`)) delete copia[k]
          }
          return copia
        })
      },

      criarAvaliacao: (dados) =>
        setAvaliacoes((avs) => [...avs, { ...dados, id: novoId() }]),
      atualizarAvaliacao: (id, dados) =>
        setAvaliacoes((avs) => avs.map((a) => (a.id === id ? { ...a, ...dados } : a))),
      removerAvaliacao: (id) => {
        setAvaliacoes((avs) => avs.filter((a) => a.id !== id))
        setNotas((ns) => {
          const copia = { ...ns }
          for (const k of Object.keys(copia)) {
            if (k.endsWith(`::${id}`)) delete copia[k]
          }
          return copia
        })
      },

      definirNota: (alunoId, avaliacaoId, valor) =>
        setNotas((ns) => ({ ...ns, [chaveNota(alunoId, avaliacaoId)]: valor })),

      configDaTurma: (turmaId) =>
        configs.find((c) => c.turmaId === turmaId) ?? CONFIG_PADRAO(turmaId),
      atualizarConfig: (turmaId, dados) =>
        setConfigs((cs) => {
          const existe = cs.some((c) => c.turmaId === turmaId)
          if (existe) {
            return cs.map((c) => (c.turmaId === turmaId ? { ...c, ...dados } : c))
          }
          return [...cs, { ...CONFIG_PADRAO(turmaId), ...dados }]
        }),

      criarEvento: (dados) =>
        setEventos((es) => [...es, { ...dados, id: novoId() }]),
      atualizarEvento: (id, dados) =>
        setEventos((es) => es.map((e) => (e.id === id ? { ...e, ...dados } : e))),
      removerEvento: (id) => setEventos((es) => es.filter((e) => e.id !== id)),

      garantirDataAula: (turmaId, data, periodo) => {
        const existente = datasAula.find((d) => d.turmaId === turmaId && d.data === data)
        if (existente) return existente.id
        const id = novoId()
        setDatasAula((ds) => [...ds, { id, turmaId, data, periodo }])
        return id
      },
      definirPresenca: (alunoId, dataAulaId, valor) =>
        setFrequencia((fs) => ({ ...fs, [chavePresenca(alunoId, dataAulaId)]: valor })),

      alternarSemAula: (turmaId, data, periodo) => {
        const existente = datasAula.find((d) => d.turmaId === turmaId && d.data === data)
        if (existente) {
          setDatasAula((ds) =>
            ds.map((d) => (d.id === existente.id ? { ...d, semAula: !d.semAula } : d)),
          )
        } else {
          setDatasAula((ds) => [...ds, { id: novoId(), turmaId, data, periodo, semAula: true }])
        }
      },
    }
  }, [
    turmas,
    alunos,
    avaliacoes,
    notas,
    configs,
    eventos,
    datasAula,
    frequencia,
    setTurmas,
    setAlunos,
    setAvaliacoes,
    setNotas,
    setConfigs,
    setEventos,
    setDatasAula,
    setFrequencia,
  ])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData deve ser usado dentro de <DataProvider>')
  return ctx
}
