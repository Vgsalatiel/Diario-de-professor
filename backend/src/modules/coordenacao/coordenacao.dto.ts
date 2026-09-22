import { z } from 'zod'

export const criarObservacaoDto = z.object({
  professorAlvoId: z.string().min(1),
  turmaId: z.string().min(1).optional(),
  texto: z.string().trim().min(1).max(2000),
})
export type CriarObservacaoDto = z.infer<typeof criarObservacaoDto>

export const criarReuniaoDto = z.object({
  titulo: z.string().trim().min(1).max(200),
  data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  hora: z.string().trim().optional(),
  turmaId: z.string().min(1).optional(),
  conteudo: z.string().trim().max(2000).optional(),
})
export type CriarReuniaoDto = z.infer<typeof criarReuniaoDto>
