import { z } from 'zod'
import { nomeSchema } from '../../utils/validators'

export const cadastroDto = z.object({
  nome: nomeSchema,
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  materia: z.string().trim().min(1, 'Informe a matéria.'),
  fotoUrl: z.string().optional(),
})
export type CadastroDto = z.infer<typeof cadastroDto>

export const loginDto = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(1, 'Informe a senha.'),
})
export type LoginDto = z.infer<typeof loginDto>

export const esqueciSenhaDto = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
})
export type EsqueciSenhaDto = z.infer<typeof esqueciSenhaDto>

export const redefinirSenhaDto = z.object({
  token: z.string().trim().min(1, 'Token inválido.'),
  novaSenha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
})
export type RedefinirSenhaDto = z.infer<typeof redefinirSenhaDto>

export const verificarEmailDto = z.object({
  token: z.string().trim().min(1, 'Token inválido.'),
})
export type VerificarEmailDto = z.infer<typeof verificarEmailDto>

export const atualizarPerfilDto = z.object({
  nome: nomeSchema.optional(),
  email: z.string().trim().toLowerCase().email('E-mail inválido.').optional(),
  materia: z.string().trim().min(1).optional(),
  fotoUrl: z.string().optional(),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.').optional(),
})
export type AtualizarPerfilDto = z.infer<typeof atualizarPerfilDto>
