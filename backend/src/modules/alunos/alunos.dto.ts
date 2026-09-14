import { z } from 'zod'
import { nomeSchema } from '../../utils/validators'

export const situacaoMatriculaEnum = z.enum(['ativo', 'inativo', 'transferido'])

export const criarAlunoDto = z.object({
  nome: nomeSchema,
  email: z.string().trim().email('E-mail inválido.').optional(),
  telefonePais: z.string().trim().optional(),
  matricula: z.string().trim().optional(),
  dataNascimento: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida.')
    .optional(),
  situacao: situacaoMatriculaEnum.optional().default('ativo'),
})
export type CriarAlunoDto = z.infer<typeof criarAlunoDto>

export const atualizarAlunoDto = criarAlunoDto.partial()
export type AtualizarAlunoDto = z.infer<typeof atualizarAlunoDto>
