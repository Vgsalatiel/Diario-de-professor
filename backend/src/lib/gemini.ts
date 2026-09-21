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

export interface AulaGeradaIA {
  numero: number
  habilidadeCodigo: string
  subtema: string
  resumo: string
}

export interface CronogramaGeradoIA {
  visaoGeral: string
  aulas: AulaGeradaIA[]
}

const SCHEMA_CRONOGRAMA = {
  type: 'object',
  properties: {
    visaoGeral: {
      type: 'string',
      description: 'Parágrafo curto resumindo o que o período vai cobrir, pro "conteúdo previsto" do plano.',
    },
    aulas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          numero: { type: 'integer' },
          habilidadeCodigo: {
            type: 'string',
            description: 'Um dos códigos da lista de habilidades candidatas fornecida — nunca um código fora dela.',
          },
          subtema: { type: 'string', description: 'Assunto específico dessa aula, dentro do tema geral.' },
          resumo: { type: 'string', description: 'O que será trabalhado nessa aula, em 1-2 frases.' },
        },
        required: ['numero', 'habilidadeCodigo', 'subtema', 'resumo'],
      },
    },
  },
  required: ['visaoGeral', 'aulas'],
}

// Gera o cronograma de um plano de aula inteiro (um período — quinzena,
// semestre etc., não uma aula avulsa) a partir de um contexto pedagógico
// estruturado. A IA só pode usar códigos da lista de habilidades
// candidatas fornecida (já filtrada e validada contra a base real da BNCC
// em backend/src/lib/bncc.ts) — o chamador ainda revalida cada código
// devolvido antes de aceitar, então mesmo que o modelo "invente" um código
// fora da lista, ele é descartado, nunca vira aula do cronograma.
export async function gerarCronogramaComIA(params: {
  etapa: 'fundamental' | 'medio'
  ano: number
  componente: string
  faixaEtaria: string
  temaGeral: string
  quantidadeAulas: number
  habilidadesCandidatas: { codigo: string; texto: string }[]
}): Promise<CronogramaGeradoIA> {
  const chave = process.env.GEMINI_API_KEY
  if (!chave) {
    throw AppError.requisicaoInvalida(
      'Geração de plano por IA não está configurada (GEMINI_API_KEY ausente).',
    )
  }

  const etapaRotulo = params.etapa === 'fundamental' ? 'Ensino Fundamental' : 'Ensino Médio'
  const listaHabilidades = params.habilidadesCandidatas
    .map((h) => `${h.codigo} — ${h.texto}`)
    .join('\n')

  const prompt = `Você é um professor experiente montando o cronograma de um período letivo inteiro, alinhado à BNCC (Base Nacional Comum Curricular).

Etapa: ${etapaRotulo}
Ano: ${params.ano}º ano
Componente: ${params.componente}
Faixa etária: ${params.faixaEtaria}
Tema geral do período: ${params.temaGeral}
Quantidade de aulas no período: ${params.quantidadeAulas}

Habilidades BNCC disponíveis pra esse componente/ano (use SOMENTE códigos desta lista, nunca invente um código fora dela):
${listaHabilidades}

Monte um cronograma com exatamente ${params.quantidadeAulas} aulas numeradas de 1 a ${params.quantidadeAulas}, distribuindo as habilidades da lista de forma pedagógica ao longo do período (pode repetir a mesma habilidade em aulas seguidas quando fizer sentido aprofundar/praticar antes de avançar — não precisa ser uma habilidade nova a cada aula). Pra cada aula, dê um subtema específico dentro do tema geral e um resumo curto do que será trabalhado. Dê também uma visão geral (1 parágrafo) resumindo o que o período inteiro vai cobrir.

Responda em português do Brasil, de forma objetiva e prática para um professor usar no planejamento.`

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
              responseSchema: SCHEMA_CRONOGRAMA,
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
    console.error('[gemini] erro na API (cronograma):', resposta?.status, detalhe)
    if (resposta?.status === 429) {
      throw AppError.requisicaoInvalida(
        'O serviço de IA atingiu o limite de uso do momento. Aguarde um minuto e tente de novo.',
      )
    }
    throw AppError.requisicaoInvalida('O serviço de IA não conseguiu gerar o cronograma agora.')
  }

  const dados = (await resposta.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const texto = dados.candidates?.[0]?.content?.parts?.[0]?.text

  if (!texto) {
    console.error('[gemini] resposta sem texto (cronograma):', JSON.stringify(dados).slice(0, 500))
    throw AppError.requisicaoInvalida('O serviço de IA não devolveu um resultado válido.')
  }

  try {
    const resultado = JSON.parse(texto) as CronogramaGeradoIA
    if (!resultado.visaoGeral || !Array.isArray(resultado.aulas)) throw new Error('formato')
    return resultado
  } catch {
    console.error('[gemini] JSON inválido (cronograma):', texto.slice(0, 500))
    throw AppError.requisicaoInvalida('O serviço de IA devolveu um resultado num formato inesperado.')
  }
}
