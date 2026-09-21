import type { RegistroAula } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { planoDoProfessor, turmaDoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import { AppError } from '../../utils/AppError'
import type { CronogramaItemDto } from '../planos/planos.dto'
import type { DefinirRegistroAulaDto } from './registrosAula.dto'

function serializar(registro: RegistroAula) {
  return { ...registro, data: paraDataISO(registro.data) }
}

// Todos os registros de aula ("o que foi aplicado no dia") do professor —
// o botão "Aula deste dia" da tela de Frequência procura aqui pela
// combinação turma + data.
export async function listarTodos(professorId: string) {
  const registros = await prisma.registroAula.findMany({
    where: { turma: { professorId, excluidoEm: null } },
  })
  return registros.map(serializar)
}

// find-or-update por turma+data (equivalente a um "upsert").
export async function definir(
  turmaId: string,
  professorId: string,
  dados: DefinirRegistroAulaDto,
) {
  await turmaDoProfessor(turmaId, professorId)
  const planoId = dados.planoId ?? null
  let bnccCodigo: string | null = null
  let bnccTexto: string | null = null

  if (dados.planoId) {
    const plano = await planoDoProfessor(dados.planoId, professorId)

    // O professor confirma manualmente qual aula do cronograma foi essa
    // (a tela já sugere pela data, mas nunca salva sozinho) — o número
    // sempre é revalidado contra o cronograma de verdade do plano aqui,
    // nunca confiamos no código/texto vindos direto do cliente.
    if (dados.planoItemNumero != null) {
      const cronograma = (plano.cronograma as CronogramaItemDto[] | null) ?? []
      const item = cronograma.find((i) => i.numero === dados.planoItemNumero)
      if (!item) throw AppError.requisicaoInvalida('Esse item não existe no cronograma do plano.')
      bnccCodigo = item.habilidadeCodigo
      bnccTexto = item.habilidadeTexto
    }
  }

  const data = new Date(dados.data)
  const planoItemNumero = dados.planoItemNumero ?? null

  const registro = await prisma.registroAula.upsert({
    where: { turmaId_data: { turmaId, data } },
    update: { resumo: dados.resumo, planoId, planoItemNumero, bnccCodigo, bnccTexto },
    create: { turmaId, data, resumo: dados.resumo, planoId, planoItemNumero, bnccCodigo, bnccTexto },
  })
  return serializar(registro)
}
