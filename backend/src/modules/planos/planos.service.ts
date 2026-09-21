import type { PlanoDeAula, Turma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { planoDoProfessor, turmaDoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import { AppError } from '../../utils/AppError'
import * as bncc from '../../lib/bncc'
import { gerarCronogramaComIA } from '../../lib/gemini'
import { calcularDatasDeAula } from '../../lib/diasAula'
import { listarFeriados } from '../feriados/feriados.service'
import type { AtualizarPlanoDto, CriarPlanoDto, CronogramaItemDto, GerarPlanoIaDto } from './planos.dto'

// O Gemini receberia um prompt gigante (e uma resposta demorada) se
// pedíssemos um cronograma pra um período com dezenas e dezenas de aulas
// (ex.: 5x/semana num semestre inteiro passa de 100). Limita o pedido às
// primeiras aulas do período — o resto o professor completa manualmente.
const MAX_AULAS_IA = 40

function serializar(plano: PlanoDeAula) {
  return {
    ...plano,
    dataInicio: paraDataISO(plano.dataInicio),
    dataFim: paraDataISO(plano.dataFim),
  }
}

// Nunca confia num cronograma vindo do cliente sem revalidar cada
// habilidade contra a base real da BNCC e contra a etapa/ano/componente
// da turma — tanto ao gerar quanto ao salvar (alguém poderia montar um
// POST direto pulando a geração por IA).
function validarCronograma(turma: Turma, cronograma: CronogramaItemDto[]) {
  if (!turma.etapaBncc || !turma.anoSerieBncc || !turma.disciplina) {
    throw AppError.requisicaoInvalida(
      'Esta turma não tem disciplina/etapa/ano (BNCC) definidos — não é possível salvar um cronograma.',
    )
  }
  for (const item of cronograma) {
    const habilidade = bncc.buscarHabilidade(item.habilidadeCodigo)
    if (
      !habilidade ||
      habilidade.etapa !== turma.etapaBncc ||
      habilidade.componente !== turma.disciplina ||
      (habilidade.anos.length > 0 && !habilidade.anos.includes(turma.anoSerieBncc))
    ) {
      throw AppError.requisicaoInvalida(`Habilidade BNCC inválida para esta turma: ${item.habilidadeCodigo}.`)
    }
  }
}

// Todos os planos de aula de todas as turmas do professor.
export async function listarTodos(professorId: string) {
  const planos = await prisma.planoDeAula.findMany({
    where: { turma: { professorId, excluidoEm: null } },
    orderBy: { dataInicio: 'desc' },
  })
  return planos.map(serializar)
}

export async function criar(turmaId: string, professorId: string, dados: CriarPlanoDto) {
  const turma = await turmaDoProfessor(turmaId, professorId)
  if (dados.cronograma) validarCronograma(turma, dados.cronograma)

  const plano = await prisma.planoDeAula.create({
    data: {
      ...dados,
      cronograma: dados.cronograma ?? undefined,
      dataInicio: new Date(dados.dataInicio),
      dataFim: new Date(dados.dataFim),
      turmaId,
    },
  })
  return serializar(plano)
}

export async function atualizar(planoId: string, professorId: string, dados: AtualizarPlanoDto) {
  const plano0 = await planoDoProfessor(planoId, professorId)
  if (dados.cronograma) validarCronograma(plano0.turma, dados.cronograma)

  const plano = await prisma.planoDeAula.update({
    where: { id: planoId },
    data: {
      ...dados,
      cronograma: dados.cronograma ?? undefined,
      dataInicio: dados.dataInicio ? new Date(dados.dataInicio) : undefined,
      dataFim: dados.dataFim ? new Date(dados.dataFim) : undefined,
    },
  })
  return serializar(plano)
}

export async function remover(planoId: string, professorId: string) {
  await planoDoProfessor(planoId, professorId)
  // Provas (eventos) e registros de aula ligados a esse plano perdem o
  // vínculo (SetNull) ou somem, conforme o schema.
  await prisma.planoDeAula.delete({ where: { id: planoId } })
}

// Assistente de planejamento contextual: calcula quantas aulas cabem no
// período do plano (dias de aula da turma menos feriados), monta o
// contexto pedagógico (etapa/ano/componente, vindos do cadastro da turma)
// + a lista real de habilidades candidatas da BNCC, e pede pro Gemini um
// cronograma cobrindo o período inteiro — devolve só uma prévia, não
// salva nada ainda. O professor decide se usa ao criar o plano de verdade.
export async function gerarComIA(turmaId: string, professorId: string, dados: GerarPlanoIaDto) {
  const turma = await turmaDoProfessor(turmaId, professorId)

  if (!turma.disciplina || !turma.etapaBncc || !turma.anoSerieBncc) {
    throw AppError.requisicaoInvalida(
      'Defina a disciplina, a etapa e o ano (BNCC) desta turma antes de usar o assistente de IA.',
    )
  }
  if (dados.dataFim < dados.dataInicio) {
    throw AppError.requisicaoInvalida('A data de término não pode ser antes da data de início.')
  }

  const habilidadesCandidatas = bncc.listarHabilidades({
    etapa: turma.etapaBncc,
    ano: turma.anoSerieBncc,
    componente: turma.disciplina,
  })
  if (habilidadesCandidatas.length === 0) {
    throw AppError.requisicaoInvalida(
      'A BNCC não tem habilidades detalhadas pra essa combinação de disciplina/etapa/ano — o assistente não tem o que sugerir aqui.',
    )
  }

  const feriados = await listarFeriados(professorId)
  const feriadosSet = new Set(feriados.map((f) => f.data))
  const todasAsDatas = calcularDatasDeAula(dados.dataInicio, dados.dataFim, turma.diasAula, feriadosSet)
  if (todasAsDatas.length === 0) {
    throw AppError.requisicaoInvalida(
      'Não há nenhum dia de aula dessa turma dentro do período escolhido.',
    )
  }
  const datas = todasAsDatas.slice(0, MAX_AULAS_IA)

  const faixaEtaria = bncc.faixaEtaria(turma.etapaBncc, turma.anoSerieBncc)

  const gerado = await gerarCronogramaComIA({
    etapa: turma.etapaBncc,
    ano: turma.anoSerieBncc,
    componente: turma.disciplina,
    faixaEtaria,
    temaGeral: dados.temaGeral,
    quantidadeAulas: datas.length,
    habilidadesCandidatas: habilidadesCandidatas.map((h) => ({ codigo: h.codigo, texto: h.texto })),
  })

  const habilidadesPorCodigo = new Map(habilidadesCandidatas.map((h) => [h.codigo, h]))
  const cronograma = gerado.aulas
    // Nunca aceita um código que a IA "inventou" fora da lista que mandamos —
    // descarta a aula em vez de confiar cegamente na resposta do modelo.
    .filter((aula) => habilidadesPorCodigo.has(aula.habilidadeCodigo))
    .slice(0, datas.length)
    .map((aula, indice) => {
      const habilidade = habilidadesPorCodigo.get(aula.habilidadeCodigo)!
      return {
        numero: indice + 1,
        data: datas[indice],
        habilidadeCodigo: habilidade.codigo,
        habilidadeTexto: habilidade.texto,
        subtema: aula.subtema,
        resumo: aula.resumo,
      }
    })

  return {
    titulo: dados.temaGeral,
    conteudo: `<p>${gerado.visaoGeral}</p>`,
    cronograma,
    aulasNoPeriodo: todasAsDatas.length,
    aulasGeradas: cronograma.length,
  }
}
