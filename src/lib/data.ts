// "Hoje" no fuso de Brasília, não o fuso do navegador — `new Date().toISOString()`
// converte pra UTC, então entre 21h e meia-noite (horário de Brasília) ele já
// devolve o dia seguinte. Mesmo problema que o backend já resolve em
// backend/src/utils/serializers.ts (hojeNoBrasil).
export function hojeISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}
