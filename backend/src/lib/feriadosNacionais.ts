// Feriados nacionais do Brasil — fixos + móveis (calculados a partir da
// Páscoa, pelo algoritmo de Gauss). Não muda de escola pra escola, então
// não precisa ficar salvo no banco — é só calcular pro ano pedido.

export interface FeriadoCalculado {
  data: string // "AAAA-MM-DD"
  titulo: string
}

function paraISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function domingoDePascoa(ano: number): Date {
  // Algoritmo de Gauss/Meeus pra Páscoa no calendário gregoriano.
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(ano, mes - 1, dia))
}

function comOffset(base: Date, dias: number): Date {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + dias)
  return d
}

export function feriadosNacionais(ano: number): FeriadoCalculado[] {
  const pascoa = domingoDePascoa(ano)

  return [
    { data: `${ano}-01-01`, titulo: 'Ano Novo' },
    { data: paraISO(comOffset(pascoa, -47)), titulo: 'Carnaval' },
    { data: paraISO(comOffset(pascoa, -2)), titulo: 'Sexta-feira Santa' },
    { data: paraISO(pascoa), titulo: 'Páscoa' },
    { data: `${ano}-04-21`, titulo: 'Tiradentes' },
    { data: `${ano}-05-01`, titulo: 'Dia do Trabalho' },
    { data: paraISO(comOffset(pascoa, 60)), titulo: 'Corpus Christi' },
    { data: `${ano}-09-07`, titulo: 'Independência do Brasil' },
    { data: `${ano}-10-12`, titulo: 'Nossa Senhora Aparecida' },
    { data: `${ano}-11-02`, titulo: 'Finados' },
    { data: `${ano}-11-15`, titulo: 'Proclamação da República' },
    { data: `${ano}-12-25`, titulo: 'Natal' },
  ]
}
