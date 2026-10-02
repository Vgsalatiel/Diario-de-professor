import { z } from 'zod'

// Mesmas regras do frontend (src/lib/validarNome.ts): letras (com acento),
// espaço, hífen e apóstrofo; 3 a 150 caracteres.
const CARACTERES_VALIDOS = /^[\p{L}\s'-]+$/u

export const nomeSchema = z
  .string()
  .trim()
  .min(3, 'O nome deve ter pelo menos 3 caracteres.')
  .max(150, 'O nome deve ter no máximo 150 caracteres.')
  .refine((v) => !/\d/.test(v), 'O nome não pode conter números.')
  .refine((v) => CARACTERES_VALIDOS.test(v), 'O nome contém caracteres inválidos.')
  .transform((v) => v.replace(/\s+/g, ' '))

// Data "AAAA-MM-DD" que existe de verdade no calendário — só a regex
// deixava passar "2026-99-99" ou "2026-02-30", que viravam Invalid Date
// (ou outro dia) e estouravam num 500 lá na frente.
export function dataISO(mensagem = 'Data inválida.') {
  return z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, mensagem)
    .refine((v) => {
      const d = new Date(`${v}T00:00:00.000Z`)
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
    }, mensagem)
}
