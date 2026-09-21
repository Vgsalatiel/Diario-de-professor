import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  Aluno,
  Avaliacao,
  ConfigCalculo,
  DataAula,
  Evento,
  ExercicioGerado,
  Feriado,
  HabilidadeBncc,
  MapaDeFrequencia,
  MapaDeNotas,
  PlanoDeAula,
  RegistroAula,
  Turma,
} from '../types'
import { api, ApiError } from '../lib/api'
import { chaveNota } from '../lib/media'
import { chavePresenca } from '../lib/frequencia'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

interface DataContextValue {
  turmas: Turma[]
  alunos: Aluno[]
  avaliacoes: Avaliacao[]
  notas: MapaDeNotas
  configs: ConfigCalculo[]
  eventos: Evento[]
  carregando: boolean

  // Turmas
  criarTurma: (dados: Omit<Turma, 'id'>) => void
  atualizarTurma: (id: string, dados: Partial<Turma>) => void
  removerTurma: (id: string) => void
  promoverTurma: (
    id: string,
    dados: { anoLetivo: string; nome: string; serie: string },
  ) => Promise<{ turma: Turma; alunosPromovidos: number }>

  // Alunos
  criarAluno: (dados: Omit<Aluno, 'id'>) => void
  atualizarAluno: (id: string, dados: Partial<Aluno>) => void
  removerAluno: (id: string) => void
  gerarExerciciosPersonalizados: (
    alunoId: string,
    dados: {
      assunto: string
      dificuldade?: string
      quantidade: number
      nomeProva?: string
      dataProva?: string
    },
  ) => Promise<ExercicioGerado>
  listarExerciciosGerados: (alunoId: string) => Promise<ExercicioGerado[]>

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
  criarEvento: (dados: Omit<Evento, 'id'>) => Promise<void>
  atualizarEvento: (id: string, dados: Partial<Evento>) => void
  removerEvento: (id: string) => void

  // Planos de aula
  planosDeAula: PlanoDeAula[]
  criarPlanoDeAula: (dados: Omit<PlanoDeAula, 'id' | 'criadoEm'>) => Promise<PlanoDeAula>
  atualizarPlanoDeAula: (id: string, dados: Partial<PlanoDeAula>) => Promise<void>
  removerPlanoDeAula: (id: string) => void
  // Assistente de planejamento contextual — lista as habilidades BNCC
  // válidas pra turma (backend filtra por etapa/ano/componente dela) e gera
  // uma proposta de conteúdo a partir da habilidade escolhida.
  listarHabilidadesBncc: (turmaId: string) => Promise<HabilidadeBncc[]>
  gerarPlanoComIA: (
    turmaId: string,
    dados: { tema: string; duracaoMinutos: number; habilidadeCodigo: string },
  ) => Promise<{ titulo: string; conteudo: string; bnccCodigo: string; bnccTexto: string }>

  // Registros de aula ("o que foi aplicado no dia")
  registrosAula: RegistroAula[]
  definirRegistroAula: (
    turmaId: string,
    data: string,
    resumo: string,
    planoId?: string,
  ) => Promise<void>

  // Frequência
  datasAula: DataAula[]
  frequencia: MapaDeFrequencia
  // Garante que exista uma aula para essa turma/data (cria se faltar) e devolve o id dela
  garantirDataAula: (turmaId: string, data: string, periodo: DataAula['periodo']) => Promise<string>
  definirPresenca: (alunoId: string, dataAulaId: string, valor: boolean | null) => void
  // Alterna se um dia conta como "sem aula" (não entra na frequência de ninguém)
  alternarSemAula: (turmaId: string, data: string, periodo: DataAula['periodo']) => Promise<void>

  // Feriados/dias sem aula pra escola inteira (todas as turmas)
  feriados: Feriado[]
  criarFeriado: (data: string, titulo: string) => Promise<void>
  removerFeriado: (id: string) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

const CONFIG_PADRAO = (turmaId: string): ConfigCalculo => ({
  turmaId,
  modelo: 'simples',
  mediaAprovacao: 6.0,
})

// Respostas cruas da API — o Prisma serializa datas/nulos de um jeito
// que precisa ser adaptado pro formato que o resto do app espera.
interface TurmaApi extends Turma {
  config: ConfigCalculo
}
interface AlunoApi extends Omit<Aluno, 'dataNascimento'> {
  dataNascimento: string | null
}
interface EventoApi extends Omit<Evento, 'turmaId' | 'planoId' | 'hora' | 'conteudo' | 'prazo'> {
  turmaId: string | null
  planoId: string | null
  hora: string | null
  conteudo: string | null
  prazo: string | null
}
interface NotaApi {
  alunoId: string
  avaliacaoId: string
  valor: number | null
}
interface FrequenciaApi {
  alunoId: string
  dataAulaId: string
  presente: boolean | null
}
interface PlanoApi extends Omit<PlanoDeAula, 'conteudo'> {
  conteudo: string | null
}
interface RegistroAulaApi extends Omit<RegistroAula, 'planoId'> {
  planoId: string | null
}

function normalizarAluno(a: AlunoApi): Aluno {
  return { ...a, dataNascimento: a.dataNascimento ?? undefined }
}

function normalizarEvento(e: EventoApi): Evento {
  return {
    ...e,
    turmaId: e.turmaId ?? undefined,
    planoId: e.planoId ?? undefined,
    hora: e.hora ?? undefined,
    conteudo: e.conteudo ?? undefined,
    prazo: e.prazo ?? undefined,
  }
}

function normalizarPlano(p: PlanoApi): PlanoDeAula {
  return { ...p, conteudo: p.conteudo ?? undefined }
}

function normalizarRegistroAula(r: RegistroAulaApi): RegistroAula {
  return { ...r, planoId: r.planoId ?? undefined }
}

function mensagemErro(erro: unknown): string {
  if (erro instanceof ApiError) return erro.message
  return 'Não foi possível concluir a operação.'
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { professora } = useAuth()
  const { notificar } = useToast()

  const [turmasBrutas, setTurmasBrutas] = useState<Turma[]>([])
  const [alunosBrutos, setAlunos] = useState<Aluno[]>([])
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [notas, setNotas] = useState<MapaDeNotas>({})
  const [configs, setConfigs] = useState<ConfigCalculo[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [datasAula, setDatasAula] = useState<DataAula[]>([])
  const [frequencia, setFrequencia] = useState<MapaDeFrequencia>({})
  const [planosDeAula, setPlanosDeAula] = useState<PlanoDeAula[]>([])
  const [registrosAula, setRegistrosAula] = useState<RegistroAula[]>([])
  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [carregando, setCarregando] = useState(true)

  // Turmas salvas antes do campo "dias de aula" existir não têm esse dado —
  // preenche com segunda a sexta pra não quebrar as telas que dependem dele.
  // Sempre em ordem alfabética por nome — criar/promover turma só anexa no
  // fim do array local, então sem isso a lista ficaria fora de ordem até
  // recarregar a página.
  const turmas = useMemo(
    () =>
      turmasBrutas
        .map((t) => (Array.isArray(t.diasAula) ? t : { ...t, diasAula: [1, 2, 3, 4, 5] }))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    [turmasBrutas],
  )

  // Mesma lógica: sempre em ordem alfabética, não importa a ordem de
  // criação/importação.
  const alunos = useMemo(
    () => [...alunosBrutos].sort((a, b) => a.nome.localeCompare(b.nome)),
    [alunosBrutos],
  )

  useEffect(() => {
    if (!professora.id) {
      setTurmasBrutas([])
      setAlunos([])
      setAvaliacoes([])
      setNotas({})
      setConfigs([])
      setEventos([])
      setDatasAula([])
      setFrequencia({})
      setPlanosDeAula([])
      setRegistrosAula([])
      setFeriados([])
      setCarregando(false)
      return
    }

    let cancelado = false
    setCarregando(true)

    Promise.all([
      api.get<TurmaApi[]>('/turmas'),
      api.get<AlunoApi[]>('/alunos'),
      api.get<Avaliacao[]>('/avaliacoes'),
      api.get<NotaApi[]>('/notas'),
      api.get<EventoApi[]>('/eventos'),
      api.get<DataAula[]>('/datas-aula'),
      api.get<FrequenciaApi[]>('/frequencia'),
      api.get<PlanoApi[]>('/planos-de-aula'),
      api.get<RegistroAulaApi[]>('/registros-aula'),
      api.get<Feriado[]>('/feriados'),
    ])
      .then(
        ([
          turmasApi,
          alunosApi,
          avaliacoesApi,
          notasApi,
          eventosApi,
          datasAulaApi,
          frequenciaApi,
          planosApi,
          registrosAulaApi,
          feriadosApi,
        ]) => {
          if (cancelado) return
          setTurmasBrutas(turmasApi.map(({ config: _config, ...t }) => t))
          setConfigs(turmasApi.map((t) => t.config))
          setAlunos(alunosApi.map(normalizarAluno))
          setAvaliacoes(avaliacoesApi)
          setNotas(
            Object.fromEntries(
              notasApi.map((n) => [chaveNota(n.alunoId, n.avaliacaoId), n.valor]),
            ),
          )
          setEventos(eventosApi.map(normalizarEvento))
          setDatasAula(datasAulaApi)
          setFrequencia(
            Object.fromEntries(
              frequenciaApi.map((f) => [chavePresenca(f.alunoId, f.dataAulaId), f.presente]),
            ),
          )
          setPlanosDeAula(planosApi.map(normalizarPlano))
          setRegistrosAula(registrosAulaApi.map(normalizarRegistroAula))
          setFeriados(feriadosApi)
        },
      )
      .catch((erro) => {
        if (!cancelado) notificar(mensagemErro(erro))
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })

    return () => {
      cancelado = true
    }
  }, [professora.id, notificar])

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
      planosDeAula,
      registrosAula,
      carregando,

      criarTurma: (dados) => {
        api
          .post<TurmaApi>('/turmas', dados)
          .then(({ config, ...turma }) => {
            setTurmasBrutas((ts) => [...ts, turma])
            setConfigs((cs) => [...cs, config])
          })
          .catch((erro) => notificar(mensagemErro(erro)))
      },
      atualizarTurma: (id, dados) => {
        api
          .patch<TurmaApi>(`/turmas/${id}`, dados)
          .then(({ config, ...turma }) => {
            setTurmasBrutas((ts) => ts.map((t) => (t.id === id ? turma : t)))
            setConfigs((cs) => cs.map((c) => (c.turmaId === id ? config : c)))
          })
          .catch((erro) => notificar(mensagemErro(erro)))
      },
      removerTurma: (id) => {
        api
          .delete(`/turmas/${id}`)
          .then(() => {
            setTurmasBrutas((ts) => ts.filter((t) => t.id !== id))
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
            setPlanosDeAula((ps) => ps.filter((p) => p.turmaId !== id))
            setRegistrosAula((rs) => rs.filter((r) => r.turmaId !== id))
          })
          .catch((erro) => notificar(mensagemErro(erro)))
      },
      promoverTurma: (id, dados) => {
        return api
          .post<{ turma: TurmaApi; alunos: AlunoApi[] }>(`/turmas/${id}/promover`, dados)
          .then(({ turma: turmaApi, alunos: novosAlunos }) => {
            const { config, ...turma } = turmaApi
            setTurmasBrutas((ts) => [...ts, turma])
            setConfigs((cs) => [...cs, config])
            setAlunos((as) => [...as, ...novosAlunos.map(normalizarAluno)])
            return { turma, alunosPromovidos: novosAlunos.length }
          })
          .catch((erro) => {
            notificar(mensagemErro(erro))
            throw erro
          })
      },

      criarAluno: (dados) => {
        api
          .post<AlunoApi>(`/turmas/${dados.turmaId}/alunos`, dados)
          .then((aluno) => setAlunos((as) => [...as, normalizarAluno(aluno)]))
          .catch((erro) => notificar(mensagemErro(erro)))
      },
      atualizarAluno: (id, dados) => {
        api
          .patch<AlunoApi>(`/alunos/${id}`, dados)
          .then((aluno) =>
            setAlunos((as) => as.map((a) => (a.id === id ? normalizarAluno(aluno) : a))),
          )
          .catch((erro) => notificar(mensagemErro(erro)))
      },
      gerarExerciciosPersonalizados: (alunoId, dados) => {
        return api
          .post<ExercicioGerado>(`/alunos/${alunoId}/exercicios-personalizados`, dados)
          .catch((erro) => {
            notificar(mensagemErro(erro))
            throw erro
          })
      },
      listarExerciciosGerados: (alunoId) => {
        return api
          .get<ExercicioGerado[]>(`/alunos/${alunoId}/exercicios-personalizados`)
          .catch((erro) => {
            notificar(mensagemErro(erro))
            throw erro
          })
      },
      removerAluno: (id) => {
        api
          .delete(`/alunos/${id}`)
          .then(() => {
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
          })
          .catch((erro) => notificar(mensagemErro(erro)))
      },

      criarAvaliacao: (dados) => {
        api
          .post<Avaliacao>(`/turmas/${dados.turmaId}/avaliacoes`, dados)
          .then((avaliacao) => setAvaliacoes((avs) => [...avs, avaliacao]))
          .catch((erro) => notificar(mensagemErro(erro)))
      },
      atualizarAvaliacao: (id, dados) => {
        api
          .patch<Avaliacao>(`/avaliacoes/${id}`, dados)
          .then((avaliacao) =>
            setAvaliacoes((avs) => avs.map((a) => (a.id === id ? avaliacao : a))),
          )
          .catch((erro) => notificar(mensagemErro(erro)))
      },
      removerAvaliacao: (id) => {
        api
          .delete(`/avaliacoes/${id}`)
          .then(() => {
            setAvaliacoes((avs) => avs.filter((a) => a.id !== id))
            setNotas((ns) => {
              const copia = { ...ns }
              for (const k of Object.keys(copia)) {
                if (k.endsWith(`::${id}`)) delete copia[k]
              }
              return copia
            })
          })
          .catch((erro) => notificar(mensagemErro(erro)))
      },

      definirNota: (alunoId, avaliacaoId, valor) => {
        const chave = chaveNota(alunoId, avaliacaoId)
        const anterior = notas[chave] ?? null
        setNotas((ns) => ({ ...ns, [chave]: valor }))
        api.put(`/alunos/${alunoId}/notas/${avaliacaoId}`, { valor }).catch((erro) => {
          setNotas((ns) => ({ ...ns, [chave]: anterior }))
          notificar(mensagemErro(erro))
        })
      },

      configDaTurma: (turmaId) =>
        configs.find((c) => c.turmaId === turmaId) ?? CONFIG_PADRAO(turmaId),
      atualizarConfig: (turmaId, dados) => {
        api
          .patch<ConfigCalculo>(`/turmas/${turmaId}/config`, dados)
          .then((config) => {
            setConfigs((cs) => {
              const existe = cs.some((c) => c.turmaId === turmaId)
              return existe
                ? cs.map((c) => (c.turmaId === turmaId ? config : c))
                : [...cs, config]
            })
          })
          .catch((erro) => notificar(mensagemErro(erro)))
      },

      criarEvento: async (dados) => {
        try {
          const evento = await api.post<EventoApi>('/eventos', dados)
          setEventos((es) => [...es, normalizarEvento(evento)])
        } catch (erro) {
          notificar(mensagemErro(erro))
          throw erro
        }
      },
      atualizarEvento: (id, dados) => {
        api
          .patch<EventoApi>(`/eventos/${id}`, dados)
          .then((evento) =>
            setEventos((es) => es.map((e) => (e.id === id ? normalizarEvento(evento) : e))),
          )
          .catch((erro) => notificar(mensagemErro(erro)))
      },
      removerEvento: (id) => {
        api
          .delete(`/eventos/${id}`)
          .then(() => setEventos((es) => es.filter((e) => e.id !== id)))
          .catch((erro) => notificar(mensagemErro(erro)))
      },

      criarPlanoDeAula: async (dados) => {
        try {
          const plano = await api.post<PlanoApi>(`/turmas/${dados.turmaId}/planos-de-aula`, dados)
          const normalizado = normalizarPlano(plano)
          setPlanosDeAula((ps) => [...ps, normalizado])
          return normalizado
        } catch (erro) {
          notificar(mensagemErro(erro))
          throw erro
        }
      },
      atualizarPlanoDeAula: async (id, dados) => {
        try {
          const plano = await api.patch<PlanoApi>(`/planos-de-aula/${id}`, dados)
          setPlanosDeAula((ps) => ps.map((p) => (p.id === id ? normalizarPlano(plano) : p)))
        } catch (erro) {
          notificar(mensagemErro(erro))
          throw erro
        }
      },
      removerPlanoDeAula: (id) => {
        api
          .delete(`/planos-de-aula/${id}`)
          .then(() => {
            setPlanosDeAula((ps) => ps.filter((p) => p.id !== id))
            // Provas (eventos) e registros ligados a esse plano perdem o
            // vínculo no servidor (SetNull) — reflete o mesmo aqui.
            setEventos((es) =>
              es.map((e) => (e.planoId === id ? { ...e, planoId: undefined } : e)),
            )
            setRegistrosAula((rs) =>
              rs.map((r) => (r.planoId === id ? { ...r, planoId: undefined } : r)),
            )
          })
          .catch((erro) => notificar(mensagemErro(erro)))
      },
      listarHabilidadesBncc: async (turmaId) => {
        const turma = turmas.find((t) => t.id === turmaId)
        if (!turma?.etapaBncc || !turma.anoSerieBncc || !turma.disciplina) return []
        const params = new URLSearchParams({
          etapa: turma.etapaBncc,
          ano: String(turma.anoSerieBncc),
          componente: turma.disciplina,
        })
        try {
          return await api.get<HabilidadeBncc[]>(`/bncc/habilidades?${params}`)
        } catch (erro) {
          notificar(mensagemErro(erro))
          throw erro
        }
      },
      gerarPlanoComIA: async (turmaId, dados) => {
        try {
          return await api.post(`/turmas/${turmaId}/planos-de-aula/gerar-ia`, dados)
        } catch (erro) {
          notificar(mensagemErro(erro))
          throw erro
        }
      },

      definirRegistroAula: async (turmaId, data, resumo, planoId) => {
        try {
          const registro = await api.put<RegistroAulaApi>(`/turmas/${turmaId}/registros-aula`, {
            data,
            resumo,
            planoId,
          })
          const normalizado = normalizarRegistroAula(registro)
          setRegistrosAula((rs) => {
            const existe = rs.some((r) => r.id === normalizado.id)
            return existe
              ? rs.map((r) => (r.id === normalizado.id ? normalizado : r))
              : [...rs, normalizado]
          })
        } catch (erro) {
          notificar(mensagemErro(erro))
          throw erro
        }
      },

      garantirDataAula: async (turmaId, data, periodo) => {
        const existente = datasAula.find((d) => d.turmaId === turmaId && d.data === data)
        if (existente) return existente.id
        try {
          const criado = await api.post<DataAula>(`/turmas/${turmaId}/datas-aula`, {
            data,
            periodo,
          })
          setDatasAula((ds) => [...ds, criado])
          return criado.id
        } catch (erro) {
          notificar(mensagemErro(erro))
          throw erro
        }
      },
      definirPresenca: (alunoId, dataAulaId, valor) => {
        const chave = chavePresenca(alunoId, dataAulaId)
        const anterior = frequencia[chave] ?? null
        setFrequencia((fs) => ({ ...fs, [chave]: valor }))
        api
          .put(`/alunos/${alunoId}/frequencia/${dataAulaId}`, { presente: valor })
          .catch((erro) => {
            setFrequencia((fs) => ({ ...fs, [chave]: anterior }))
            notificar(mensagemErro(erro))
          })
      },

      alternarSemAula: async (turmaId, data, periodo) => {
        try {
          const atualizado = await api.post<DataAula>(
            `/turmas/${turmaId}/datas-aula/alternar-sem-aula`,
            { data, periodo },
          )
          setDatasAula((ds) => {
            const existe = ds.some((d) => d.id === atualizado.id)
            return existe
              ? ds.map((d) => (d.id === atualizado.id ? atualizado : d))
              : [...ds, atualizado]
          })
        } catch (erro) {
          notificar(mensagemErro(erro))
        }
      },

      feriados,
      criarFeriado: async (data, titulo) => {
        try {
          const criado = await api.post<Feriado>('/feriados', { data, titulo })
          setFeriados((fs) => [...fs, criado].sort((a, b) => a.data.localeCompare(b.data)))
        } catch (erro) {
          notificar(mensagemErro(erro))
          throw erro
        }
      },
      removerFeriado: async (id) => {
        try {
          await api.delete(`/feriados/${id}`)
          setFeriados((fs) => fs.filter((f) => f.id !== id))
        } catch (erro) {
          notificar(mensagemErro(erro))
          throw erro
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
    planosDeAula,
    registrosAula,
    feriados,
    carregando,
    notificar,
  ])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData deve ser usado dentro de <DataProvider>')
  return ctx
}
