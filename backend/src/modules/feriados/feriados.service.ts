import { prisma } from '../../lib/prisma'
import { feriadosNacionais } from '../../lib/feriadosNacionais'
import { paraDataISO } from '../../utils/serializers'
import { AppError } from '../../utils/AppError'
import type { CriarFeriadoDto } from './feriados.dto'

// Calcula feriados nacionais numa janela generosa (ano anterior até dois
// anos à frente) — cobre virada de ano letivo sem precisar de parâmetro.
function janelaDeAnos(): number[] {
  const anoAtual = new Date().getFullYear()
  return [anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2]
}

export async function listarFeriados(professorId: string) {
  const automaticos = janelaDeAnos().flatMap((ano) =>
    feriadosNacionais(ano).map((f) => ({ ...f, origemAutomatica: true, id: null as string | null })),
  )

  const manuais = await prisma.feriado.findMany({ where: { professorId } })
  const manuaisPorData = new Map(
    manuais.map((f) => [paraDataISO(f.data)!, { id: f.id, data: paraDataISO(f.data)!, titulo: f.titulo, origemAutomatica: false }]),
  )

  // Feriado manual na mesma data de um automático substitui ele (ex.: o
  // professor quer um título diferente pra aquele feriado).
  const resultado = new Map<string, { id: string | null; data: string; titulo: string; origemAutomatica: boolean }>()
  for (const f of automaticos) resultado.set(f.data, f)
  for (const [data, f] of manuaisPorData) resultado.set(data, f)

  return Array.from(resultado.values()).sort((a, b) => a.data.localeCompare(b.data))
}

export async function criarFeriado(professorId: string, dados: CriarFeriadoDto) {
  const existente = await prisma.feriado.findUnique({
    where: { professorId_data: { professorId, data: new Date(`${dados.data}T00:00:00.000Z`) } },
  })
  if (existente) throw AppError.conflito('Já existe um feriado cadastrado nessa data.')

  const feriado = await prisma.feriado.create({
    data: { professorId, titulo: dados.titulo, data: new Date(`${dados.data}T00:00:00.000Z`) },
  })
  return { id: feriado.id, data: paraDataISO(feriado.data)!, titulo: feriado.titulo, origemAutomatica: false }
}

export async function removerFeriado(feriadoId: string, professorId: string) {
  const feriado = await prisma.feriado.findUnique({ where: { id: feriadoId } })
  if (!feriado || feriado.professorId !== professorId) throw AppError.naoEncontrado('Feriado')
  await prisma.feriado.delete({ where: { id: feriadoId } })
}
