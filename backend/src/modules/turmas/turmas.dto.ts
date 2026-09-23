import { z } from 'zod'

export const sistemaPeriodoEnum = z.enum(['bimestre', 'trimestre', 'semestre'])
export const etapaBnccEnum = z.enum(['fundamental', 'medio'])
export const turnoEnum = z.enum(['manha', 'tarde', 'noite'])

export const criarTurmaDto = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da turma.'),
  serie: z.string().trim().default(''),
  anoLetivo: z.string().trim().min(1, 'Informe o ano letivo.'),
  escola: z.string().trim().min(1, 'Informe a escola.'),
  sistemaPeriodo: sistemaPeriodoEnum,
  cor: z.string().trim().min(1),
  diasAula: z
    .array(z.number().int().min(0).max(6))
    .min(1, 'Marque pelo menos um dia de aula.'),
  disciplina: z.string().trim().nullable().optional(),
  etapaBncc: etapaBnccEnum.nullable().optional(),
  anoSerieBncc: z.number().int().min(1).max(9).nullable().optional(),
  turno: turnoEnum.nullable().optional(),
})
export type CriarTurmaDto = z.infer<typeof criarTurmaDto>

// .partial() sozinho não bastaria: "serie" tem .default('') no schema de
// criação, então um PATCH que não manda esse campo faria o Zod aplicar o
// default e apagar a série já cadastrada. O .extend() troca por uma versão
// sem default.
export const atualizarTurmaDto = criarTurmaDto.partial().extend({
  serie: z.string().trim().optional(),
})
export type AtualizarTurmaDto = z.infer<typeof atualizarTurmaDto>

export const promoverTurmaDto = z.object({
  anoLetivo: z.string().trim().min(1, 'Informe o ano letivo da turma nova.'),
  nome: z.string().trim().min(1, 'Informe o nome da turma nova.'),
  serie: z.string().trim().default(''),
})
export type PromoverTurmaDto = z.infer<typeof promoverTurmaDto>

export const modeloCalculoEnum = z.enum(['simples', 'ponderada'])
export const tipoAvaliacaoEnum = z.enum(['nota', 'conceito'])

export const atualizarConfigDto = z.object({
  modelo: modeloCalculoEnum.optional(),
  mediaAprovacao: z.number().min(0).max(10).optional(),
  tipoAvaliacao: tipoAvaliacaoEnum.optional(),
})
export type AtualizarConfigDto = z.infer<typeof atualizarConfigDto>
