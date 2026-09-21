const DIAS_PADRAO = [1, 2, 3, 4, 5]

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

// Todas as datas de aula de uma turma dentro de um período — cruza os
// dias da semana em que ela tem aula com o intervalo do plano, pulando
// feriados/dias sem aula. Usado pelo Assistente de planejamento contextual
// pra saber quantas aulas cabem no período, sem o professor precisar
// contar/digitar isso.
export function calcularDatasDeAula(
  dataInicioISO: string,
  dataFimISO: string,
  diasAula: number[],
  feriados: ReadonlySet<string> = new Set(),
): string[] {
  const dias = diasAula.length > 0 ? diasAula : DIAS_PADRAO
  const datas: string[] = []
  const atual = paraDate(dataInicioISO)
  const fim = paraDate(dataFimISO)

  while (atual <= fim) {
    const iso = paraISO(atual)
    if (dias.includes(atual.getDay()) && !feriados.has(iso)) datas.push(iso)
    atual.setDate(atual.getDate() + 1)
  }
  return datas
}
