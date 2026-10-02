import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  Aluno,
  Avaliacao,
  ConfigCalculo,
  CronogramaItem,
  DataAula,
  Evento,
  EtapaBncc,
  ExercicioGerado,
  Feriado,
  MapaDeFrequencia,
  MapaDeConceitos,
  MapaDeEntregas,
  MapaDeNotas,
  PlanoDeAula,
  RegistroAula,
  StatusEntrega,
  SugestaoAvaliacao,
  Turma,
} from '../types'
import { api, ApiError } from '../lib/api'
import { chaveNota } from '../lib/media'
import { chavePresenca } from '../lib/frequencia'
import { chaveEntrega } from '../lib/entregas'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

interface DataContextValue {
  turmas: Turma[]
  alunos: Aluno[]
  avaliacoes: Avaliacao[]
  notas: MapaDeNotas
  conceitos: MapaDeConceitos
  configs: ConfigCalculo[]
  eventos: Evento[]
  carregando: boolean

  criarTurma: (dados: Omit<Turma, 'id' | 'professores'>) => Promise<boolean>
  atualizarTurma: (id: string, dados: Partial<Turma>) => Promise<boolean>
  removerTurma: (id: string) => void
  promoverTurma: (
    id: string,
    dados: { anoLetivo: string; nome: string; serie: string },
  ) => Promise<{ turma: Turma; alunosPromovidos: number }>

  // Alunos
  criarAluno: (dados: Omit<Aluno, 'id'>) => Promise<boolean>
  atualizarAluno: (id: string, dados: Partial<Aluno>) => Promise<boolean>
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
  criarAvaliacao: (dados: Omit<Avaliacao, 'id'>) => Promise<boolean>
  atualizarAvaliacao: (id: string, dados: Partial<Avaliacao>) => Promise<boolean>
  removerAvaliacao: (id: string) => void

  // Notas
  definirNota: (alunoId: string, avaliacaoId: string, valor: number | null) => Promise<boolean>
  definirConceito: (alunoId: string, avaliacaoId: string, conceito: string | null) => void

  // Configuração de cálculo
  configDaTurma: (turmaId: string) => ConfigCalculo
  atualizarConfig: (turmaId: string, dados: Partial<ConfigCalculo>) => Promise<boolean>

  // Eventos
  criarEvento: (dados: Omit<Evento, 'id' | 'professorId'>) => Promise<void>
  atualizarEvento: (id: string, dados: Partial<Evento>) => Promise<boolean>
  removerEvento: (id: string) => void

  // Planos de aula
  planosDeAula: PlanoDeAula[]
  criarPlanoDeAula: (dados: Omit<PlanoDeAula, 'id' | 'criadoEm'>) => Promise<PlanoDeAula>
  atualizarPlanoDeAula: (id: string, dados: Partial<PlanoDeAula>) => Promise<void>
  removerPlanoDeAula: (id: string) => void
  // Nomes oficiais dos componentes curriculares da etapa — usados pra
  // preencher o campo "Disciplina" da turma sem risco de digitar um nome
  // que não bate com a base da BNCC.
  listarComponentesBncc: (etapa: EtapaBncc) => Promise<string[]>
  // Assistente de planejamento contextual — gera o cronograma do período
  // inteiro do plano (uma aula planejada por data de aula da turma no
  // intervalo), distribuindo habilidades reais da BNCC.
  gerarPlanoComIA: (
    turmaId: string,
    dados: { temaGeral: string; dataInicio: string; dataFim: string },
  ) => Promise<{
    titulo: string
    conteudo: string
    cronograma: CronogramaItem[]
    aulasNoPeriodo: number
    aulasGeradas: number
    sugestoesAtividades: SugestaoAvaliacao[]
    sugestoesProvas: SugestaoAvaliacao[]
  }>

  // Registros de aula ("o que foi aplicado no dia")
  registrosAula: RegistroAula[]
  definirRegistroAula: (
    turmaId: string,
    data: string,
    resumo: string,
    planoId?: string,
    planoItemNumero?: number,
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

  // Entregas de prova/atividade — status por aluno (feito/pendente/não entregou)
  entregas: MapaDeEntregas
  definirEntrega: (alunoId: string, eventoId: string, status: StatusEntrega) => void
}

// As funções que devolvem Promise<boolean> resolvem true quando o
// servidor confirmou; no erro já mostram o aviso e resolvem false, pra
// tela só fechar o modal/avisar sucesso depois da confirmação.
const DataContext = createContext<DataContextValue | null>(null)

const CONFIG_PADRAO = (turmaId: string, professorId: string): ConfigCalculo => ({
  turmaId,
  professorId,
  modelo: 'simples',
  mediaAprovacao: 6.0,
  tipoAvaliacao: 'nota',
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
  conceito: string | null
}
interface FrequenciaApi {
  alunoId: string
  dataAulaId: string
  presente: boolean | null
}
interface EntregaApi {
  alunoId: string
  eventoId: string
  status: StatusEntrega
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
  // Quantas vezes cada nota (chaveNota) já foi enviada — ver definirNota.
  const versaoNota = useRef<Record<string, number>>({})
  // Criação de data de aula em andamento, por turma+data — ver garantirDataAula.
  const criandoDataAula = useRef<Record<string, Promise<DataAula>>>({})
  const [conceitos, setConceitos] = useState<MapaDeConceitos>({})
  const [configs, setConfigs] = useState<ConfigCalculo[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [datasAula, setDatasAula] = useState<DataAula[]>([])
  const [frequencia, setFrequencia] = useState<MapaDeFrequencia>({})
  const [entregas, setEntregas] = useState<MapaDeEntregas>({})
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
      setConceitos({})
      setConfigs([])
      setEventos([])
      setDatasAula([])
      setFrequencia({})
      setEntregas({})
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
      api.get<EntregaApi[]>('/entregas'),
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
          entregasApi,
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
          setConceitos(
            Object.fromEntries(
              notasApi.map((n) => [chaveNota(n.alunoId, n.avaliacaoId), n.conceito]),
            ),
          )
          setEventos(eventosApi.map(normalizarEvento))
          setDatasAula(datasAulaApi)
          setFrequencia(
            Object.fromEntries(
              frequenciaApi.map((f) => [chavePresenca(f.alunoId, f.dataAulaId), f.presente]),
            ),
          )
          setEntregas(
            Object.fromEntries(
              entregasApi.map((e) => [chaveEntrega(e.alunoId, e.eventoId), e.status]),
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
      conceitos,
      configs,
      eventos,
      datasAula,
      frequencia,
      entregas,
      planosDeAula,
      registrosAula,
      carregando,

      criarTurma: (dados) => {
        return api
          .post<TurmaApi>('/turmas', dados)
          .then(({ config, ...turma }) => {
            setTurmasBrutas((ts) => [...ts, turma])
            setConfigs((cs) => [...cs, config])
          })
          .then(() => true)
          .catch((erro) => {
            notificar(mensagemErro(erro))
            return false
          })
      },
      atualizarTurma: (id, dados) => {
        return api
          .patch<TurmaApi>(`/turmas/${id}`, dados)
          .then(({ config, ...turma }) => {
            setTurmasBrutas((ts) => ts.map((t) => (t.id === id ? turma : t)))
            setConfigs((cs) => cs.map((c) => (c.turmaId === id && c.professorId === config.professorId ? config : c)))
          })
          .then(() => true)
          .catch((erro) => {
            notificar(mensagemErro(erro))
            return false
          })
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
            setConceitos((cs) => {
              const copia = { ...cs }
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
            setEntregas((es) => {
              const copia = { ...es }
              for (const k of Object.keys(copia)) {
                const [aId] = k.split('::')
                if (alunosDaTurma.includes(aId)) delete copia[k]
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
        return api
          .post<AlunoApi>(`/turmas/${dados.turmaId}/alunos`, dados)
          .then((aluno) => setAlunos((as) => [...as, normalizarAluno(aluno)]))
          .then(() => true)
          .catch((erro) => {
            notificar(mensagemErro(erro))
            return false
          })
      },
      atualizarAluno: (id, dados) => {
        return api
          .patch<AlunoApi>(`/alunos/${id}`, dados)
          .then((aluno) =>
            setAlunos((as) => as.map((a) => (a.id === id ? normalizarAluno(aluno) : a))),
          )
          .then(() => true)
          .catch((erro) => {
            notificar(mensagemErro(erro))
            return false
          })
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
            setConceitos((cs) => {
              const copia = { ...cs }
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
            setEntregas((es) => {
              const copia = { ...es }
              for (const k of Object.keys(copia)) {
                if (k.startsWith(`${id}::`)) delete copia[k]
              }
              return copia
            })
          })
          .catch((erro) => notificar(mensagemErro(erro)))
      },

      criarAvaliacao: (dados) => {
        return api
          .post<Avaliacao>(`/turmas/${dados.turmaId}/avaliacoes`, dados)
          .then((avaliacao) => setAvaliacoes((avs) => [...avs, avaliacao]))
          .then(() => true)
          .catch((erro) => {
            notificar(mensagemErro(erro))
            return false
          })
      },
      atualizarAvaliacao: (id, dados) => {
        return api
          .patch<Avaliacao>(`/avaliacoes/${id}`, dados)
          .then((avaliacao) =>
            setAvaliacoes((avs) => avs.map((a) => (a.id === id ? avaliacao : a))),
          )
          .then(() => true)
          .catch((erro) => {
            notificar(mensagemErro(erro))
            return false
          })
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
            setConceitos((cs) => {
              const copia = { ...cs }
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
        const versao = (versaoNota.current[chave] ?? 0) + 1
        versaoNota.current[chave] = versao
        setNotas((ns) => ({ ...ns, [chave]: valor }))
        return api
          .put(`/alunos/${alunoId}/notas/${avaliacaoId}`, { valor })
          .then(() => true)
          .catch((erro) => {
            // Só desfaz se nenhuma edição mais nova dessa nota foi enviada
            // depois; senão a falha antiga apagaria um valor mais recente.
            if (versaoNota.current[chave] === versao) {
              setNotas((ns) => ({ ...ns, [chave]: anterior }))
            }
            notificar(mensagemErro(erro))
            return false
          })
      },

      definirConceito: (alunoId, avaliacaoId, conceito) => {
        const chave = chaveNota(alunoId, avaliacaoId)
        const anterior = conceitos[chave] ?? null
        setConceitos((cs) => ({ ...cs, [chave]: conceito }))
        api.put(`/alunos/${alunoId}/notas/${avaliacaoId}`, { conceito }).catch((erro) => {
          setConceitos((cs) => ({ ...cs, [chave]: anterior }))
          notificar(mensagemErro(erro))
        })
      },

      configDaTurma: (turmaId) =>
        configs.find((c) => c.turmaId === turmaId) ?? CONFIG_PADRAO(turmaId, professora.id),
      atualizarConfig: (turmaId, dados) => {
        // Otimista (como as notas): a tela já mostra o valor novo e volta
        // ao anterior se o servidor recusar.
        const anterior = configs.find((c) => c.turmaId === turmaId)
        if (anterior) {
          setConfigs((cs) => cs.map((c) => (c.turmaId === turmaId ? { ...c, ...dados } : c)))
        }
        return api
          .patch<ConfigCalculo>(`/turmas/${turmaId}/config`, dados)
          .then((config) => {
            setConfigs((cs) => {
              const existe = cs.some((c) => c.turmaId === turmaId)
              return existe
                ? cs.map((c) => (c.turmaId === turmaId ? config : c))
                : [...cs, config]
            })
          })
          .then(() => true)
          .catch((erro) => {
            if (anterior) setConfigs((cs) => cs.map((c) => (c.turmaId === turmaId ? anterior : c)))
            notificar(mensagemErro(erro))
            return false
          })
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
        return api
          .patch<EventoApi>(`/eventos/${id}`, dados)
          .then((evento) =>
            setEventos((es) => es.map((e) => (e.id === id ? normalizarEvento(evento) : e))),
          )
          .then(() => true)
          .catch((erro) => {
            notificar(mensagemErro(erro))
            return false
          })
      },
      removerEvento: (id) => {
        api
          .delete(`/eventos/${id}`)
          .then(() => {
            setEventos((es) => es.filter((e) => e.id !== id))
            setEntregas((es) => {
              const copia = { ...es }
              for (const k of Object.keys(copia)) {
                if (k.endsWith(`::${id}`)) delete copia[k]
              }
              return copia
            })
          })
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
      gerarPlanoComIA: async (turmaId, dados) => {
        try {
          return await api.post(`/turmas/${turmaId}/planos-de-aula/gerar-ia`, dados)
        } catch (erro) {
          notificar(mensagemErro(erro))
          throw erro
        }
      },
      listarComponentesBncc: async (etapa) => {
        try {
          return await api.get<string[]>(`/bncc/componentes?etapa=${etapa}`)
        } catch (erro) {
          notificar(mensagemErro(erro))
          throw erro
        }
      },

      definirRegistroAula: async (turmaId, data, resumo, planoId, planoItemNumero) => {
        try {
          const registro = await api.put<RegistroAulaApi>(`/turmas/${turmaId}/registros-aula`, {
            data,
            resumo,
            planoId,
            planoItemNumero,
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
        // Cliques rápidos em alunos diferentes num dia ainda sem aula criada
        // reaproveitam a mesma requisição em vez de disparar uma por clique.
        const chave = `${turmaId}::${data}`
        let pendente = criandoDataAula.current[chave]
        if (!pendente) {
          pendente = api
            .post<DataAula>(`/turmas/${turmaId}/datas-aula`, { data, periodo })
            .then((criado) => {
              setDatasAula((ds) => (ds.some((d) => d.id === criado.id) ? ds : [...ds, criado]))
              return criado
            })
            .finally(() => {
              delete criandoDataAula.current[chave]
            })
          criandoDataAula.current[chave] = pendente
        }
        try {
          return (await pendente).id
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

      definirEntrega: (alunoId, eventoId, status) => {
        const chave = chaveEntrega(alunoId, eventoId)
        const anterior = entregas[chave]
        setEntregas((es) => ({ ...es, [chave]: status }))
        api
          .put(`/alunos/${alunoId}/entregas/${eventoId}`, { status })
          .catch((erro) => {
            setEntregas((es) => ({ ...es, [chave]: anterior }))
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
    conceitos,
    configs,
    eventos,
    datasAula,
    frequencia,
    entregas,
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
