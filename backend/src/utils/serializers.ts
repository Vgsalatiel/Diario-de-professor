// O Prisma guarda datas como DateTime; o frontend espera strings
// "AAAA-MM-DD" simples (compara com localeCompare, faz split('-') etc.).
export function paraDataISO(data: Date | null | undefined): string | null {
  if (!data) return null
  return data.toISOString().slice(0, 10)
}
