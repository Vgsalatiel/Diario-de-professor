import { z } from 'zod'
import { limparHtml } from '../../lib/html'

export const definirRegistroAulaDto = z.object({
  data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  resumo: z.string().trim().min(1, 'Escreva um resumo do que foi aplicado.').transform(limparHtml),
  planoId: z.string().trim().optional(),
  // Confirmado pelo professor (sugestão pré-marcada pela data, nunca
  // salva sozinha) — qual item do cronograma do plano essa aula é.
  planoItemNumero: z.number().int().min(1).optional(),
})
export type DefinirRegistroAulaDto = z.infer<typeof definirRegistroAulaDto>
