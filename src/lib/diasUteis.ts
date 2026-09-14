const NOMES_DIA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

const DIAS_UTEIS_PADRAO = [1, 2, 3, 4, 5]

function paraDate(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

function paraISO(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

// Se o dia não estiver entre os dias de aula da turma, avança até achar
// um que esteja (no máximo uma volta de semana, pra nunca travar).
export function diaValidoMaisProximo(iso: string, diasAula: number[]): string {
  const dias = diasAula.length > 0 ? diasAula : DIAS_UTEIS_PADRAO
  const d = paraDate(iso)
  let tentativas = 0
  while (!dias.includes(d.getDay()) && tentativas < 14) {
    d.setDate(d.getDate() + 1)
    tentativas++
  }
  return paraISO(d)
}

// Anda um dia de aula para frente (1) ou para trás (-1), pulando os dias
// em que essa turma não tem aula.
export function passoDiaValido(iso: string, direcao: 1 | -1, diasAula: number[]): string {
  const dias = diasAula.length > 0 ? diasAula : DIAS_UTEIS_PADRAO
  const d = paraDate(iso)
  let tentativas = 0
  do {
    d.setDate(d.getDate() + direcao)
    tentativas++
  } while (!dias.includes(d.getDay()) && tentativas < 14)
  return paraISO(d)
}

export function nomeDiaSemana(iso: string): string {
  return NOMES_DIA[paraDate(iso).getDay()]
}
