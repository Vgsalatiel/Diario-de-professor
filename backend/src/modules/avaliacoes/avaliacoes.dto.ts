import { z } from 'zod'

export const periodoEnum = z.enum(['1', '2', '3', '4'])

export const criarAvaliacaoDto = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da avaliação.'),
  peso: z.number().positive('O peso deve ser maior que zero.').default(1),
  periodo: periodoEnum,
})
export type CriarAvaliacaoDto = z.infer<typeof criarAvaliacaoDto>

// .partial() sozinho não bastaria: "peso" tem .default(1) no schema de
// criação, então um PATCH que não manda esse campo faria o Zod aplicar o
// default e zerar o peso já configurado. O .extend() troca por uma versão
// sem default.
export const atualizarAvaliacaoDto = criarAvaliacaoDto.partial().extend({
  peso: z.number().positive('O peso deve ser maior que zero.').optional(),
})
export type AtualizarAvaliacaoDto = z.infer<typeof atualizarAvaliacaoDto>
