import { AppError } from '../utils/AppError'

// "flash-lite" tem cota gratuita bem maior que o "flash" cheio (500/dia
// contra 20/dia, em set/2026) — mais que suficiente pra gerar exercícios,
// que não exige o modelo mais potente da linha.
const MODELO = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite'

export interface QuestaoGerada {
  enunciado: string
  gabarito: string
}

export interface ExerciciosGerados {
  titulo: string
  questoes: QuestaoGerada[]
}

// Formato que pedimos pro Gemini devolver — mantém o parsing simples e
// robusto, sem depender de regex pra extrair JSON de um texto solto.
const SCHEMA_RESPOSTA = {
  type: 'object',
  properties: {
    titulo: { type: 'string' },
    questoes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          enunciado: { type: 'string' },
          gabarito: { type: 'string' },
        },
        required: ['enunciado', 'gabarito'],
      },
    },
  },
  required: ['titulo', 'questoes'],
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// O Gemini responde 503 ("alta demanda") com alguma frequência mesmo em
// uso normal — tenta de novo algumas vezes com um pequeno intervalo antes
// de desistir, em vez de já devolver erro pro professor na primeira falha.
// 429 é limite de cota (plano gratuito: poucas requisições por minuto) —
// a própria resposta costuma dizer quantos segundos esperar.
const TENTATIVAS = 3
const ESPERA_ENTRE_TENTATIVAS_MS = 1500
const ESPERA_PADRAO_COTA_MS = 12_000

function extrairEsperaSugerida(corpo: string): number | null {
  const m = corpo.match(/"retryDelay":\s*"(\d+)s"/)
  return m ? Number(m[1]) * 1000 : null
}

export async function gerarExerciciosPersonalizados(params: {
  nomeAluno: string
  assunto: string
  dificuldade?: string
  quantidade: number
}): Promise<ExerciciosGerados> {
  const chave = process.env.GEMINI_API_KEY
  if (!chave) {
    throw AppError.requisicaoInvalida(
      'Geração de exercícios por IA não está configurada (GEMINI_API_KEY ausente).',
    )
  }

  const prompt = `Você é um professor criando uma lista de exercícios personalizada para UM aluno específico.

Aluno: ${params.nomeAluno}
Assunto: ${params.assunto}
${params.dificuldade ? `Observações sobre o aluno (dificuldades/facilidades): ${params.dificuldade}` : 'Sem observações específicas sobre o aluno.'}

Gere exatamente ${params.quantidade} questões sobre o assunto, adaptadas ao perfil descrito: reforce mais os pontos em que o aluno tem dificuldade e inclua ao menos uma questão que aproveite o que ele já domina bem, para manter a confiança. As questões devem ser adequadas ao nível escolar sugerido pelo assunto/observações. Cada questão precisa ter um enunciado claro e um gabarito (resposta correta com explicação breve).

Responda em português do Brasil.`

  let resposta: Response | null = null
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      resposta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${chave}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: SCHEMA_RESPOSTA,
            },
          }),
        },
      )
    } catch {
      throw AppError.requisicaoInvalida('Não foi possível falar com o serviço de IA. Tente de novo.')
    }

    if (resposta.ok) break

    // 503 costuma ser sobrecarga temporária do lado do Gemini; 429 é limite
    // de cota (mais comum no plano gratuito). Outros erros (chave inválida,
    // requisição malformada) não se resolvem tentando de novo.
    if (resposta.status !== 503 && resposta.status !== 429) break
    if (tentativa === TENTATIVAS) break

    if (resposta.status === 429) {
      const corpo = await resposta.text().catch(() => '')
      await esperar(extrairEsperaSugerida(corpo) ?? ESPERA_PADRAO_COTA_MS)
    } else {
      await esperar(ESPERA_ENTRE_TENTATIVAS_MS)
    }
  }

  if (!resposta || !resposta.ok) {
    const detalhe = resposta ? await resposta.text().catch(() => '') : ''
    console.error('[gemini] erro na API:', resposta?.status, detalhe)
    if (resposta?.status === 429) {
      throw AppError.requisicaoInvalida(
        'O serviço de IA atingiu o limite de uso do momento. Aguarde um minuto e tente de novo.',
      )
    }
    throw AppError.requisicaoInvalida('O serviço de IA não conseguiu gerar os exercícios agora.')
  }

  const dados = (await resposta.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const texto = dados.candidates?.[0]?.content?.parts?.[0]?.text

  if (!texto) {
    console.error('[gemini] resposta sem texto:', JSON.stringify(dados).slice(0, 500))
    throw AppError.requisicaoInvalida('O serviço de IA não devolveu um resultado válido.')
  }

  try {
    const resultado = JSON.parse(texto) as ExerciciosGerados
    if (!resultado.titulo || !Array.isArray(resultado.questoes)) throw new Error('formato')
    return resultado
  } catch {
    console.error('[gemini] JSON inválido:', texto.slice(0, 500))
    throw AppError.requisicaoInvalida('O serviço de IA devolveu um resultado num formato inesperado.')
  }
}

export interface PlanoGeradoIA {
  objetivos: string[]
  desenvolvimento: string[]
  avaliacao: string
}

const SCHEMA_PLANO = {
  type: 'object',
  properties: {
    objetivos: { type: 'array', items: { type: 'string' } },
    desenvolvimento: {
      type: 'array',
      items: { type: 'string' },
      description: 'Passos/etapas da aula, na ordem em que acontecem.',
    },
    avaliacao: { type: 'string', description: 'Como verificar se a habilidade foi desenvolvida.' },
  },
  required: ['objetivos', 'desenvolvimento', 'avaliacao'],
}

// Gera uma proposta de plano de aula a partir de um contexto pedagógico
// estruturado — NUNCA a partir de um prompt solto tipo "crie uma aula
// sobre frações". O código e o texto da habilidade BNCC já chegam aqui
// validados contra a base real (backend/src/lib/bncc.ts, buscarHabilidade),
// então o modelo só usa a habilidade, nunca precisa "lembrar" ou inventar
// o código — isso evita o risco de alucinação de códigos da BNCC.
export async function gerarPlanoDeAulaComIA(params: {
  etapa: 'fundamental' | 'medio'
  ano: number
  componente: string
  faixaEtaria: string
  habilidadeCodigo: string
  habilidadeTexto: string
  tema: string
  duracaoMinutos: number
}): Promise<PlanoGeradoIA> {
  const chave = process.env.GEMINI_API_KEY
  if (!chave) {
    throw AppError.requisicaoInvalida(
      'Geração de plano por IA não está configurada (GEMINI_API_KEY ausente).',
    )
  }

  const etapaRotulo = params.etapa === 'fundamental' ? 'Ensino Fundamental' : 'Ensino Médio'
  const prompt = `Você é um professor experiente montando uma proposta de plano de aula alinhada à BNCC (Base Nacional Comum Curricular).

Etapa: ${etapaRotulo}
Ano: ${params.ano}º ano
Componente: ${params.componente}
Faixa etária: ${params.faixaEtaria}
Habilidade BNCC: ${params.habilidadeCodigo} — ${params.habilidadeTexto}
Tema: ${params.tema}
Duração: ${params.duracaoMinutos} minutos

Monte uma proposta de plano de aula para UMA aula com essa duração, que desenvolva especificamente a habilidade BNCC indicada, adequada à faixa etária. Dê:
- objetivos: de 2 a 4 objetivos de aprendizagem específicos dessa aula, ligados à habilidade.
- desenvolvimento: os passos da aula na ordem em que acontecem (ex.: abertura, atividade principal, fechamento), com o tempo aproximado de cada um, somando a duração total informada.
- avaliacao: uma forma simples de verificar, ainda nessa aula, se a habilidade está sendo desenvolvida.

Responda em português do Brasil, de forma objetiva e prática para um professor usar em sala.`

  let resposta: Response | null = null
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      resposta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${chave}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: SCHEMA_PLANO,
            },
          }),
        },
      )
    } catch {
      throw AppError.requisicaoInvalida('Não foi possível falar com o serviço de IA. Tente de novo.')
    }

    if (resposta.ok) break
    if (resposta.status !== 503 && resposta.status !== 429) break
    if (tentativa === TENTATIVAS) break

    if (resposta.status === 429) {
      const corpo = await resposta.text().catch(() => '')
      await esperar(extrairEsperaSugerida(corpo) ?? ESPERA_PADRAO_COTA_MS)
    } else {
      await esperar(ESPERA_ENTRE_TENTATIVAS_MS)
    }
  }

  if (!resposta || !resposta.ok) {
    const detalhe = resposta ? await resposta.text().catch(() => '') : ''
    console.error('[gemini] erro na API (plano):', resposta?.status, detalhe)
    if (resposta?.status === 429) {
      throw AppError.requisicaoInvalida(
        'O serviço de IA atingiu o limite de uso do momento. Aguarde um minuto e tente de novo.',
      )
    }
    throw AppError.requisicaoInvalida('O serviço de IA não conseguiu gerar o plano agora.')
  }

  const dados = (await resposta.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const texto = dados.candidates?.[0]?.content?.parts?.[0]?.text

  if (!texto) {
    console.error('[gemini] resposta sem texto (plano):', JSON.stringify(dados).slice(0, 500))
    throw AppError.requisicaoInvalida('O serviço de IA não devolveu um resultado válido.')
  }

  try {
    const resultado = JSON.parse(texto) as PlanoGeradoIA
    if (!Array.isArray(resultado.objetivos) || !Array.isArray(resultado.desenvolvimento) || !resultado.avaliacao) {
      throw new Error('formato')
    }
    return resultado
  } catch {
    console.error('[gemini] JSON inválido (plano):', texto.slice(0, 500))
    throw AppError.requisicaoInvalida('O serviço de IA devolveu um resultado num formato inesperado.')
  }
}
