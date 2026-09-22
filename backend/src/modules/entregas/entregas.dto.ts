import { z } from 'zod'

export const statusEntregaEnum = z.enum(['pendente', 'feito', 'naoEntregou'])

export const definirEntregaDto = z.object({
  status: statusEntregaEnum,
})
export type DefinirEntregaDto = z.infer<typeof definirEntregaDto>
