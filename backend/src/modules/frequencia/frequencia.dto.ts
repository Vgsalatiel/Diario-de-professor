import { z } from 'zod'
import { dataISO } from '../../utils/validators'

export const periodoEnum = z.enum(['1', '2', '3', '4'])

export const garantirDataAulaDto = z.object({
  data: dataISO('Data inválida.'),
  periodo: periodoEnum,
})
export type GarantirDataAulaDto = z.infer<typeof garantirDataAulaDto>

export const definirPresencaDto = z.object({
  presente: z.boolean().nullable(),
})
export type DefinirPresencaDto = z.infer<typeof definirPresencaDto>
