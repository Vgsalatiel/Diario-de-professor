import { z } from 'zod'

// O frontend manda só um dos dois campos por vez, conforme o tipo de
// avaliação da turma (nota numérica ou conceito) — nunca os dois juntos.
export const definirNotaDto = z.object({
  valor: z.number().min(0, 'A nota não pode ser negativa.').max(10, 'A nota vai de 0 a 10.').nullable().optional(),
  conceito: z.string().trim().min(1).max(50).nullable().optional(),
})
export type DefinirNotaDto = z.infer<typeof definirNotaDto>
