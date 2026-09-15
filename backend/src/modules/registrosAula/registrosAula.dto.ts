import { z } from 'zod'

export const definirRegistroAulaDto = z.object({
  data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  resumo: z.string().trim().min(1, 'Escreva um resumo do que foi aplicado.'),
  planoId: z.string().trim().optional(),
})
export type DefinirRegistroAulaDto = z.infer<typeof definirRegistroAulaDto>
