import { z } from 'zod'

export const tipoEventoEnum = z.enum(['prova', 'trabalho', 'reuniao', 'outro'])

export const criarEventoDto = z.object({
  titulo: z.string().trim().min(1, 'Informe o título.'),
  tipo: tipoEventoEnum,
  data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  hora: z.string().trim().optional(),
  turmaId: z.string().trim().optional(),
  conteudo: z.string().trim().optional(),
})
export type CriarEventoDto = z.infer<typeof criarEventoDto>

export const atualizarEventoDto = criarEventoDto.partial()
export type AtualizarEventoDto = z.infer<typeof atualizarEventoDto>
