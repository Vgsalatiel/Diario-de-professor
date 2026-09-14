import { z } from 'zod'

export const periodoEnum = z.enum(['1', '2', '3', '4'])

export const criarAvaliacaoDto = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da avaliação.'),
  peso: z.number().positive('O peso deve ser maior que zero.').default(1),
  periodo: periodoEnum,
})
export type CriarAvaliacaoDto = z.infer<typeof criarAvaliacaoDto>

export const atualizarAvaliacaoDto = criarAvaliacaoDto.partial()
export type AtualizarAvaliacaoDto = z.infer<typeof atualizarAvaliacaoDto>
