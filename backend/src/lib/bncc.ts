import habilidadesData from '../data/bncc.json'

// Base de dados real da BNCC (código + descrição oficiais), extraída de
// github.com/bncc-dev/bncc-dados (CC BY 4.0), que por sua vez espelha os
// arquivos exportados de downloadbncc.mec.gov.br.
//
// Cobre só Ensino Fundamental e Médio: a Educação Infantil é organizada por
// campos de experiência (não por componente+ano), então não encaixa nesse
// mesmo formato de busca — ver EtapaBncc no schema.prisma.
export interface HabilidadeBncc {
  codigo: string
  texto: string
  componente: string
  etapa: 'fundamental' | 'medio'
  anos: number[] // vazio = vale pra todos os anos daquela etapa (comum no Médio)
}

const habilidades = habilidadesData as HabilidadeBncc[]

export function listarComponentes(etapa?: string): string[] {
  const todas = habilidades.filter((h) => !etapa || h.etapa === etapa)
  return Array.from(new Set(todas.map((h) => h.componente))).sort((a, b) => a.localeCompare(b))
}

export function listarHabilidades(filtro: {
  etapa?: string
  ano?: number
  componente?: string
}): HabilidadeBncc[] {
  return habilidades.filter((h) => {
    if (filtro.etapa && h.etapa !== filtro.etapa) return false
    if (filtro.componente && h.componente !== filtro.componente) return false
    if (filtro.ano != null && h.anos.length > 0 && !h.anos.includes(filtro.ano)) return false
    return true
  })
}

// Nunca confiamos num código de habilidade vindo do cliente sem checar
// contra a base real — é o que evita a IA (ou qualquer requisição
// manipulada) "inventar" um código EF/EM que não existe de verdade.
export function buscarHabilidade(codigo: string): HabilidadeBncc | null {
  return habilidades.find((h) => h.codigo === codigo) ?? null
}

// Idade típica de quem cursa esse ano/etapa no Brasil — usada só como
// contexto pro Assistente de IA adequar a linguagem da aula, não é um dado
// oficial da BNCC (que não define faixa etária por ano, só por etapa).
export function faixaEtaria(etapa: 'fundamental' | 'medio', ano: number): string {
  const idade = etapa === 'fundamental' ? ano + 5 : ano + 14
  return `${idade}–${idade + 1} anos`
}
