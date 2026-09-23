import type { PlanoDeAula, Turma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { planoDoProfessor, turmaAtribuidaAoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import { AppError } from '../../utils/AppError'
import * as bncc from '../../lib/bncc'
import { gerarCronogramaComIA, gerarSugestoesAvaliacoesComIA } from '../../lib/gemini'
import { calcularDatasDeAula } from '../../lib/diasAula'
import { listarFeriados } from '../feriados/feriados.service'
import type { AtualizarPlanoDto, CriarPlanoDto, CronogramaItemDto, GerarPlanoIaDto } from './planos.dto'

// O Gemini receberia um prompt gigante (e uma resposta demorada) se
// pedíssemos um cronograma pra um período com dezenas e dezenas de aulas
// (ex.: 5x/semana num semestre inteiro passa de 100). Limita o pedido às
// primeiras aulas do período — o resto o professor completa manualmente.
const MAX_AULAS_IA = 40

// Quantidade de avaliações sugeridas pelo assistente junto com o
// cronograma — 2 atividades mais curtas (formativas) e 2 provas mais
// completas, cobrindo partes diferentes do tema geral do período.
const QUANTIDADE_ATIVIDADES_SUGERIDAS = 2
const QUESTOES_POR_ATIVIDADE_SUGERIDA = 5
const QUANTIDADE_PROVAS_SUGERIDAS = 2
const QUESTOES_POR_PROVA_SUGERIDA = 8

// Espalha N datas dentro do período (nunca no primeiro nem no último dia),
// pra sugerir uma data razoável pra cada atividade/prova — o professor
// ainda pode trocar antes de aceitar a sugestão.
function distribuirDatas(datas: string[], quantidade: number): string[] {
  if (datas.length === 0 || quantidade <= 0) return []
  return Array.from({ length: quantidade }, (_, i) => {
    const posicao = Math.round(((i + 1) * datas.length) / (quantidade + 1))
    const indice = Math.min(datas.length - 1, Math.max(0, posicao))
    return datas[indice]
  })
}

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
function validarCronograma(turma: Turma, disciplina: string | undefined, cronograma: CronogramaItemDto[]) {
  if (!turma.etapaBncc || !turma.anoSerieBncc || !disciplina) {
    throw AppError.requisicaoInvalida(
      'Esta turma não tem disciplina/etapa/ano (BNCC) definidos — não é possível salvar um cronograma.',
    )
  }
  for (const item of cronograma) {
    const habilidade = bncc.buscarHabilidade(item.habilidadeCodigo)
    if (
      !habilidade ||
      habilidade.etapa !== turma.etapaBncc ||
      habilidade.componente !== disciplina ||
      (habilidade.anos.length > 0 && !habilidade.anos.includes(turma.anoSerieBncc))
    ) {
      throw AppError.requisicaoInvalida(`Habilidade BNCC inválida para esta turma: ${item.habilidadeCodigo}.`)
    }
  }
}

// Todos os planos de aula do professor, em todas as turmas em que dá aula.
export async function listarTodos(professorId: string) {
  const planos = await prisma.planoDeAula.findMany({
    where: { professorId, turma: { excluidoEm: null } },
    orderBy: { dataInicio: 'desc' },
  })
  return planos.map(serializar)
}

export async function criar(turmaId: string, professorId: string, dados: CriarPlanoDto) {
  const turma = await turmaAtribuidaAoProfessor(turmaId, professorId)
  const disciplina = turma.professores[0]?.disciplina
  if (dados.cronograma) validarCronograma(turma, disciplina, dados.cronograma)

  const plano = await prisma.planoDeAula.create({
    data: {
      ...dados,
      cronograma: dados.cronograma ?? undefined,
      dataInicio: new Date(dados.dataInicio),
      dataFim: new Date(dados.dataFim),
      turmaId,
      professorId,
    },
  })
  return serializar(plano)
}

export async function atualizar(planoId: string, professorId: string, dados: AtualizarPlanoDto) {
  const plano0 = await planoDoProfessor(planoId, professorId)
  if (dados.cronograma) {
    validarCronograma(plano0.turma, plano0.turma.professores[0]?.disciplina, dados.cronograma)
  }

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
  const turma = await turmaAtribuidaAoProfessor(turmaId, professorId)
  const disciplina = turma.professores[0]?.disciplina

  if (!disciplina || !turma.etapaBncc || !turma.anoSerieBncc) {
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
    componente: disciplina,
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

  const [gerado, sugestoes] = await Promise.all([
    gerarCronogramaComIA({
      etapa: turma.etapaBncc,
      ano: turma.anoSerieBncc,
      componente: disciplina,
      faixaEtaria,
      temaGeral: dados.temaGeral,
      quantidadeAulas: datas.length,
      habilidadesCandidatas: habilidadesCandidatas.map((h) => ({ codigo: h.codigo, texto: h.texto })),
    }),
    gerarSugestoesAvaliacoesComIA({
      etapa: turma.etapaBncc,
      ano: turma.anoSerieBncc,
      componente: disciplina,
      faixaEtaria,
      temaGeral: dados.temaGeral,
      quantidadeAtividades: QUANTIDADE_ATIVIDADES_SUGERIDAS,
      questoesPorAtividade: QUESTOES_POR_ATIVIDADE_SUGERIDA,
      quantidadeProvas: QUANTIDADE_PROVAS_SUGERIDAS,
      questoesPorProva: QUESTOES_POR_PROVA_SUGERIDA,
    }),
  ])

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

  const datasAtividades = distribuirDatas(datas, sugestoes.atividades.length)
  const datasProvas = distribuirDatas(datas, sugestoes.provas.length)

  return {
    titulo: dados.temaGeral,
    conteudo: `<p>${gerado.visaoGeral}</p>`,
    cronograma,
    aulasNoPeriodo: todasAsDatas.length,
    aulasGeradas: cronograma.length,
    sugestoesAtividades: sugestoes.atividades.map((a, i) => ({
      titulo: a.titulo,
      questoes: a.questoes,
      data: datasAtividades[i],
    })),
    sugestoesProvas: sugestoes.provas.map((p, i) => ({
      titulo: p.titulo,
      questoes: p.questoes,
      data: datasProvas[i],
    })),
  }
}
