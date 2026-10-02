import { z } from 'zod'

// O frontend manda só um dos dois campos por vez, conforme o tipo de
// avaliação da turma (nota numérica ou conceito) — nunca os dois juntos.
// Mesmas opções do frontend (OPCOES_CONCEITO em src/types.ts).
export const OPCOES_CONCEITO = ['A', 'B', 'C', 'D'] as const

export const definirNotaDto = z
  .object({
    valor: z.number().min(0, 'A nota não pode ser negativa.').max(10, 'A nota vai de 0 a 10.').nullable().optional(),
    conceito: z.enum(OPCOES_CONCEITO, 'Conceito inválido.').nullable().optional(),
  })
  .refine((d) => d.valor === undefined || d.conceito === undefined, 'Envie a nota ou o conceito, não os dois.')
export type DefinirNotaDto = z.infer<typeof definirNotaDto>
