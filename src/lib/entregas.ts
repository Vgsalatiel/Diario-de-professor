export function chaveEntrega(alunoId: string, eventoId: string): string {
  return `${alunoId}::${eventoId}`
}
