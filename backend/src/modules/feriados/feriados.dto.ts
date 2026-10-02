import { z } from 'zod'
import { dataISO } from '../../utils/validators'

export const criarFeriadoDto = z.object({
  data: dataISO('Data inválida.'),
  titulo: z.string().trim().min(1, 'Informe um título.').max(200),
})
export type CriarFeriadoDto = z.infer<typeof criarFeriadoDto>
