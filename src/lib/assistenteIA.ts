// Protótipo do assistente de IA — respostas simuladas (sem chamada a
// nenhum serviço externo). A ideia é validar o fluxo de tela antes de
// eventualmente ligar isso a uma IA de verdade.

import { escapar } from './export'

export interface ResultadoCorrecao {
  notaEstimada: number
  pontosFortes: string[]
  pontosAtencao: string[]
  comentario: string
}

export interface QuestaoGerada {
  enunciado: string
  gabarito: string
}

export interface ResultadoExercicio {
  titulo: string
  questoes: QuestaoGerada[]
}

function hash(texto: string): number {
  let h = 5381
  for (let i = 0; i < texto.length; i++) {
    h = (h * 33) ^ texto.charCodeAt(i)
  }
  return Math.abs(h)
}

function escolher<T>(lista: T[], semente: number, quantidade: number): T[] {
  const resultado: T[] = []
  for (let i = 0; i < quantidade && i < lista.length; i++) {
    resultado.push(lista[(semente + i * 7) % lista.length])
  }
  return resultado
}

const BANCO_FORTES = [
  'Raciocínio bem estruturado do início ao fim.',
  'Boa organização visual das respostas.',
  'Uso correto do vocabulário específico do tema.',
  'Demonstra domínio dos conceitos principais.',
  'Justificativas claras nas etapas de resolução.',
]

const BANCO_ATENCAO = [
  'Revisar a formatação das unidades de medida.',
  'Alguns passos intermediários poderiam ser mais detalhados.',
  'Atenção a pequenos erros de digitação/cálculo.',
  'Faltou concluir a última questão.',
  'Vale reforçar a revisão antes da entrega.',
]

const BANCO_COMENTARIOS = [
  'No geral, um bom exercício — com pequenos ajustes fica ainda melhor.',
  'Trabalho consistente, dá pra perceber que o conteúdo foi estudado.',
  'Alguns pontos merecem atenção, mas a base está sólida.',
  'Resultado dentro do esperado para o nível da turma.',
]

export function gerarCorrecaoSimulada(nomeArquivo: string, tamanho: number): ResultadoCorrecao {
  const h = hash(`${nomeArquivo}:${tamanho}`)
  const notaEstimada = Math.round((5 + (h % 51) / 10) * 10) / 10

  return {
    notaEstimada,
    pontosFortes: escolher(BANCO_FORTES, h, 2),
    pontosAtencao: escolher(BANCO_ATENCAO, h >> 3, 2),
    comentario: BANCO_COMENTARIOS[h % BANCO_COMENTARIOS.length],
  }
}

interface BancoTema {
  chaves: string[]
  questoes: QuestaoGerada[]
}

function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

const TEMAS: BancoTema[] = [
  {
    chaves: ['matemat', 'frac', 'equac', 'geometri'],
    questoes: [
      { enunciado: 'Quanto é 3/4 mais 1/2? Dê a resposta na forma mais simples.', gabarito: '5/4 (ou 1 inteiro e 1/4)' },
      { enunciado: 'Descubra o valor de x: 2x + 5 = 17.', gabarito: 'x = 6' },
      { enunciado: 'Um retângulo tem 8 cm de largura e 5 cm de altura. Qual é a área dele?', gabarito: '40 cm²' },
      { enunciado: 'Escreva 0,75 como fração, da forma mais simples possível.', gabarito: '3/4' },
      { enunciado: 'Um trem anda 240 km em 3 horas. Qual é a velocidade média dele?', gabarito: '80 km/h' },
    ],
  },
  {
    chaves: ['portugu', 'gramatic', 'redac'],
    questoes: [
      { enunciado: 'Leia a frase "Choveu muito ontem à noite." Essa frase tem sujeito? Explique por quê.', gabarito: 'Não. É um verbo que fala do tempo (chover), e esse tipo de verbo não tem sujeito.' },
      { enunciado: 'Troque o verbo por outra palavra parecida na frase "O menino correu até a escola."', gabarito: 'Resposta livre — ex.: "O menino correu até a escola" vira "O menino disparou até a escola."' },
      { enunciado: 'Na frase "Os alunos entregaram o trabalho": quem fez a ação? O que foi feito?', gabarito: 'Quem fez: "os alunos". O que fizeram: "entregaram o trabalho".' },
      { enunciado: 'Escreva uma frase comparando duas coisas sem usar a palavra "como" (isso se chama metáfora).', gabarito: 'Resposta livre — ex.: "Seus olhos são duas estrelas."' },
    ],
  },
  {
    chaves: ['histori', 'guerra', 'revoluc', 'coloniz'],
    questoes: [
      { enunciado: 'Dê um motivo que ajudou a começar a Revolução Industrial.', gabarito: 'Resposta livre — ex.: a invenção de máquinas que produziam mais rápido que o trabalho manual.' },
      { enunciado: 'Cite dois países que participaram da Segunda Guerra Mundial e diga de que lado cada um lutou.', gabarito: 'Resposta livre — ex.: Alemanha (Eixo) e Estados Unidos (Aliados).' },
      { enunciado: 'O que os portugueses fizeram quando chegaram e colonizaram o Brasil?', gabarito: 'Resposta livre — ex.: exploraram recursos naturais e usaram mão de obra escravizada.' },
    ],
  },
  {
    chaves: ['geografi', 'clima', 'relevo', 'populac'],
    questoes: [
      { enunciado: 'Cite dois tipos de clima que existem no Brasil.', gabarito: 'Resposta livre — ex.: equatorial e semiárido.' },
      { enunciado: 'O que significa dizer que um lugar tem muita gente morando nele (alta densidade populacional)?', gabarito: 'Significa que há muitas pessoas vivendo em um espaço pequeno.' },
      { enunciado: 'O que pode acontecer com o clima de um lugar quando as árvores são derrubadas?', gabarito: 'Resposta livre — ex.: chove menos e a temperatura sobe.' },
    ],
  },
  {
    chaves: ['cienc', 'biolog', 'fisic', 'quimic', 'celul'],
    questoes: [
      { enunciado: 'Quais são as duas partes principais de uma célula animal?', gabarito: 'A membrana (que envolve a célula) e o núcleo (que fica no centro).' },
      { enunciado: 'Um objeto de 10 kg ganha uma aceleração de 2 m/s². Qual é a força aplicada nele?', gabarito: 'F = m × a = 10 × 2 = 20 N' },
      { enunciado: 'O que é fotossíntese? Explique com suas palavras.', gabarito: 'É o processo em que as plantas usam luz do sol, água e ar para produzir seu próprio alimento e liberar oxigênio.' },
    ],
  },
]

const TEMA_GENERICO: BancoTema = {
  chaves: [],
  questoes: [
    { enunciado: 'Explique com suas próprias palavras o que você aprendeu sobre esse assunto.', gabarito: 'Resposta livre — observe se a explicação está clara.' },
    { enunciado: 'Dê um exemplo do dia a dia que tenha a ver com esse assunto.', gabarito: 'Resposta livre — observe se o exemplo faz sentido com o tema.' },
    { enunciado: 'Qual foi a parte mais difícil de entender sobre esse assunto? Por quê?', gabarito: 'Resposta livre — ajuda a saber onde o aluno ainda tem dúvida.' },
    { enunciado: 'Conte como esse assunto pode aparecer na sua vida ou na sua rotina.', gabarito: 'Resposta livre — observe se a relação faz sentido.' },
  ],
}

function extrairQuantidade(pedido: string): number {
  const m = pedido.match(/(\d+)\s*(quest(ã|a)o|quest(õ|o)es|exerc[íi]cios?)/i)
  const n = m ? Number(m[1]) : 5
  return Math.max(1, Math.min(10, n || 5))
}

function escolherTema(pedido: string): BancoTema {
  const texto = normalizarBusca(pedido)
  return TEMAS.find((t) => t.chaves.some((chave) => texto.includes(chave))) ?? TEMA_GENERICO
}

export function gerarExercicioSimulado(pedido: string): ResultadoExercicio {
  const tema = escolherTema(pedido)
  const quantidade = extrairQuantidade(pedido)

  const questoes: QuestaoGerada[] = []
  for (let i = 0; i < quantidade; i++) {
    questoes.push(tema.questoes[i % tema.questoes.length])
  }

  return {
    titulo: `Exercício gerado a partir de: "${pedido}"`,
    questoes,
  }
}

// HTML só com os enunciados (sem gabarito), pronto para impressão/PDF.
export function gerarHTMLExercicio(resultado: ResultadoExercicio): string {
  const itens = resultado.questoes
    .map((q) => `<li>${escapar(q.enunciado)}</li>`)
    .join('\n')

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapar(resultado.titulo)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2433; margin: 32px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .meta { color: #6b7280; margin-bottom: 24px; font-size: 13px; }
  ol { padding-left: 22px; }
  li { margin-bottom: 18px; line-height: 1.5; font-size: 14px; }
  @media print {
    body { margin: 0; }
  }
</style>
</head>
<body>
  <h1>Exercício</h1>
  <p class="meta">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
  <ol>
${itens}
  </ol>
</body>
</html>`
}
