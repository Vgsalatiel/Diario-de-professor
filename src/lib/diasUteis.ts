const NOMES_DIA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

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

export function ehFimDeSemana(iso: string): boolean {
  const dia = paraDate(iso).getDay()
  return dia === 0 || dia === 6
}

// Se cair no fim de semana, avança para a próxima segunda-feira.
export function diaUtilMaisProximo(iso: string): string {
  const d = paraDate(iso)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1)
  }
  return paraISO(d)
}

// Anda um dia útil para frente (1) ou para trás (-1), pulando fins de semana.
export function passoDiaUtil(iso: string, direcao: 1 | -1): string {
  const d = paraDate(iso)
  do {
    d.setDate(d.getDate() + direcao)
  } while (d.getDay() === 0 || d.getDay() === 6)
  return paraISO(d)
}

export function nomeDiaSemana(iso: string): string {
  return NOMES_DIA[paraDate(iso).getDay()]
}
