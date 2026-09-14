import { z } from 'zod'

export const definirNotaDto = z.object({
  valor: z.number().min(0, 'A nota não pode ser negativa.').max(10, 'A nota vai de 0 a 10.').nullable(),
})
export type DefinirNotaDto = z.infer<typeof definirNotaDto>
