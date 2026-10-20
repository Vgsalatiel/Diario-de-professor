// Grade do calendário da Agenda: semanas de segunda a sábado (tem escola
// com aula no sábado; domingo não entra). Tudo em data ISO "AAAA-MM-DD",
// montado em UTC pra não escorregar um dia por fuso/horário de verão.

export interface DiaCalendario {
  data: string
  dia: number
  doMes: boolean // false = dia do mês vizinho, só completando a semana
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

// `mes` no formato "AAAA-MM". Devolve as semanas que tocam o mês, cada uma
// com 6 dias (seg..sáb).
export function semanasDoMes(mes: string): DiaCalendario[][] {
  const [ano, m] = mes.split('-').map(Number)
  const primeiro = new Date(Date.UTC(ano, m - 1, 1))
  const ultimo = new Date(Date.UTC(ano, m, 0))

  // Volta até a segunda-feira da semana do dia 1 (domingo conta como fim
  // da semana anterior: se o dia 1 é domingo, a primeira semana começa no dia 2).
  const inicio = new Date(primeiro)
  const diaSemana = inicio.getUTCDay() // 0=dom .. 6=sáb
  if (diaSemana === 0) inicio.setUTCDate(inicio.getUTCDate() + 1)
  else inicio.setUTCDate(inicio.getUTCDate() - (diaSemana - 1))

  const semanas: DiaCalendario[][] = []
  for (const seg = inicio; seg <= ultimo; seg.setUTCDate(seg.getUTCDate() + 7)) {
    const semana: DiaCalendario[] = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(seg)
      d.setUTCDate(seg.getUTCDate() + i)
      semana.push({ data: iso(d), dia: d.getUTCDate(), doMes: d.getUTCMonth() === m - 1 })
    }
    semanas.push(semana)
  }
  return semanas
}

export function somarMeses(mes: string, delta: number): string {
  const [ano, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(ano, m - 1 + delta, 1))
  return iso(d).slice(0, 7)
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function nomeDoMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number)
  const nome = MESES[m - 1]
  return `${nome[0].toUpperCase()}${nome.slice(1)} de ${ano}`
}

// "21 de outubro" — usado nos rótulos lidos pelo leitor de tela.
export function diaPorExtenso(data: string): string {
  const [, m, d] = data.split('-').map(Number)
  return `${d} de ${MESES[m - 1]}`
}
