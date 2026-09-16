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
  dificuldades: z.string().trim().max(2000, 'Máximo de 2000 caracteres.').optional(),
})
export type CriarAlunoDto = z.infer<typeof criarAlunoDto>

export const atualizarAlunoDto = criarAlunoDto.partial()
export type AtualizarAlunoDto = z.infer<typeof atualizarAlunoDto>

export const gerarExerciciosDto = z.object({
  assunto: z.string().trim().min(1, 'Informe o assunto do exercício.').max(300),
  dificuldade: z.string().trim().max(2000).optional(),
  quantidade: z.number().int().min(1).max(10).default(5),
})
export type GerarExerciciosDto = z.infer<typeof gerarExerciciosDto>
