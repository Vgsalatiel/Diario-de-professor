import { z } from 'zod'

// Formato do PushSubscription.toJSON() do navegador
export const inscreverDto = z.object({
  endpoint: z.url('Endpoint inválido.').max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
})
export type InscreverDto = z.infer<typeof inscreverDto>

export const removerInscricaoDto = z.object({
  endpoint: z.string().min(1).max(1000),
})
