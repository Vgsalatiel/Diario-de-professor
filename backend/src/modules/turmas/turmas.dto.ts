import { z } from 'zod'

export const sistemaPeriodoEnum = z.enum(['bimestre', 'trimestre', 'semestre'])

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
})
export type CriarTurmaDto = z.infer<typeof criarTurmaDto>

export const atualizarTurmaDto = criarTurmaDto.partial()
export type AtualizarTurmaDto = z.infer<typeof atualizarTurmaDto>

export const modeloCalculoEnum = z.enum(['simples', 'ponderada'])

export const atualizarConfigDto = z.object({
  modelo: modeloCalculoEnum.optional(),
  mediaAprovacao: z.number().min(0).max(10).optional(),
})
export type AtualizarConfigDto = z.infer<typeof atualizarConfigDto>
