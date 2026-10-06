// O Prisma guarda datas como DateTime; o frontend espera strings
// "AAAA-MM-DD" simples (compara com localeCompare, faz split('-') etc.).
export function paraDataISO(data: Date | null | undefined): string | null {
  if (!data) return null
  return data.toISOString().slice(0, 10)
}

// "Hoje" no fuso de Brasília, não o fuso do servidor (Render roda em UTC) —
// importante pro job de avisos diários bater com o dia que o professor vê.
export function hojeNoBrasil(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

export function amanhaNoBrasil(): string {
  const amanha = new Date(`${hojeNoBrasil()}T12:00:00.000Z`)
  amanha.setUTCDate(amanha.getUTCDate() + 1)
  return paraDataISO(amanha)!
}
