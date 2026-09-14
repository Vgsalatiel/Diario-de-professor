import { z } from 'zod'

export const periodoEnum = z.enum(['1', '2', '3', '4'])

export const garantirDataAulaDto = z.object({
  data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  periodo: periodoEnum,
})
export type GarantirDataAulaDto = z.infer<typeof garantirDataAulaDto>

export const definirPresencaDto = z.object({
  presente: z.boolean().nullable(),
})
export type DefinirPresencaDto = z.infer<typeof definirPresencaDto>
