import type { PlanoDeAula } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { planoDoProfessor, turmaDoProfessor } from '../../utils/ownership'
import { paraDataISO } from '../../utils/serializers'
import { AppError } from '../../utils/AppError'
import * as bncc from '../../lib/bncc'
import { gerarPlanoDeAulaComIA } from '../../lib/gemini'
import type { AtualizarPlanoDto, CriarPlanoDto, GerarPlanoIaDto } from './planos.dto'

function serializar(plano: PlanoDeAula) {
  return {
    ...plano,
    dataInicio: paraDataISO(plano.dataInicio),
    dataFim: paraDataISO(plano.dataFim),
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
  await turmaDoProfessor(turmaId, professorId)
  const plano = await prisma.planoDeAula.create({
    data: {
      ...dados,
      dataInicio: new Date(dados.dataInicio),
      dataFim: new Date(dados.dataFim),
      turmaId,
    },
  })
  return serializar(plano)
}

export async function atualizar(planoId: string, professorId: string, dados: AtualizarPlanoDto) {
  await planoDoProfessor(planoId, professorId)
  const plano = await prisma.planoDeAula.update({
    where: { id: planoId },
    data: {
      ...dados,
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

// Assistente de planejamento contextual: monta o contexto pedagógico da
// turma (etapa/ano/componente, vindos do cadastro dela) + a habilidade BNCC
// escolhida (revalidada aqui, nunca confiada do cliente) e pede pro Gemini
// uma proposta — devolve só uma prévia, não salva nada ainda. O professor
// decide se usa como conteúdo do plano ao salvar normalmente.
export async function gerarComIA(turmaId: string, professorId: string, dados: GerarPlanoIaDto) {
  const turma = await turmaDoProfessor(turmaId, professorId)

  if (!turma.disciplina || !turma.etapaBncc || !turma.anoSerieBncc) {
    throw AppError.requisicaoInvalida(
      'Defina a disciplina, a etapa e o ano (BNCC) desta turma antes de usar o assistente de IA.',
    )
  }

  const habilidade = bncc.buscarHabilidade(dados.habilidadeCodigo)
  if (
    !habilidade ||
    habilidade.etapa !== turma.etapaBncc ||
    habilidade.componente !== turma.disciplina ||
    (habilidade.anos.length > 0 && !habilidade.anos.includes(turma.anoSerieBncc))
  ) {
    throw AppError.requisicaoInvalida('Habilidade BNCC inválida para esta turma.')
  }

  const faixaEtaria = bncc.faixaEtaria(turma.etapaBncc, turma.anoSerieBncc)

  const gerado = await gerarPlanoDeAulaComIA({
    etapa: turma.etapaBncc,
    ano: turma.anoSerieBncc,
    componente: turma.disciplina,
    faixaEtaria,
    habilidadeCodigo: habilidade.codigo,
    habilidadeTexto: habilidade.texto,
    tema: dados.tema,
    duracaoMinutos: dados.duracaoMinutos,
  })

  const conteudo = [
    '<h3>Objetivos</h3>',
    '<ul>',
    ...gerado.objetivos.map((o) => `<li>${o}</li>`),
    '</ul>',
    '<h3>Desenvolvimento da aula</h3>',
    '<ol>',
    ...gerado.desenvolvimento.map((d) => `<li>${d}</li>`),
    '</ol>',
    '<h3>Avaliação</h3>',
    `<p>${gerado.avaliacao}</p>`,
  ].join('')

  return {
    titulo: `${dados.tema} — ${habilidade.codigo}`,
    conteudo,
    bnccCodigo: habilidade.codigo,
    bnccTexto: habilidade.texto,
  }
}
