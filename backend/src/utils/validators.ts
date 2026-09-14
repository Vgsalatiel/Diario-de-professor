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
