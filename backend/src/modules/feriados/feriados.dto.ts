import { z } from 'zod'

export const criarFeriadoDto = z.object({
  data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  titulo: z.string().trim().min(1, 'Informe um título.').max(200),
})
export type CriarFeriadoDto = z.infer<typeof criarFeriadoDto>
