import { z } from 'zod'
import { dataISO } from '../../utils/validators'
import { limparHtml } from '../../lib/html'

export const tipoEventoEnum = z.enum(['prova', 'trabalho', 'reuniao', 'outro'])

// Campo opcional que dá pra limpar: "" ou null viram null (apaga o valor
// salvo); ausente (undefined) mantém como está.
function limpavel<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (v) => (v === null || (typeof v === 'string' && v.trim() === '') ? null : v),
    schema.nullable().optional(),
  )
}

export const criarEventoDto = z.object({
  titulo: z.string().trim().min(1, 'Informe o título.').max(200, 'Máximo de 200 caracteres.'),
  tipo: tipoEventoEnum,
  data: dataISO('Data inválida.'),
  hora: limpavel(z.string().trim().regex(/^\d{2}:\d{2}$/, 'Horário inválido.')),
  turmaId: limpavel(z.string().trim()),
  planoId: limpavel(z.string().trim()),
  conteudo: limpavel(z.string().trim().max(20000, 'Conteúdo grande demais.').transform(limparHtml)),
  prazo: limpavel(dataISO('Prazo inválido.')),
})
export type CriarEventoDto = z.infer<typeof criarEventoDto>

export const atualizarEventoDto = criarEventoDto.partial().extend({
  concluido: z.boolean().optional(),
})
export type AtualizarEventoDto = z.infer<typeof atualizarEventoDto>
