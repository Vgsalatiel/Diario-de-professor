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

// .partial() sozinho não bastaria aqui: como "situacao" tem .default('ativo')
// no schema de criação, um PATCH que não manda esse campo faria o Zod
// aplicar o default e sobrescrever silenciosamente a situação atual do
// aluno. O .extend() troca esse campo por uma versão sem default.
export const atualizarAlunoDto = criarAlunoDto.partial().extend({
  situacao: situacaoMatriculaEnum.optional(),
})
export type AtualizarAlunoDto = z.infer<typeof atualizarAlunoDto>

export const gerarExerciciosDto = z.object({
  assunto: z.string().trim().min(1, 'Informe o assunto do exercício.').max(300),
  dificuldade: z.string().trim().max(2000).optional(),
  quantidade: z.number().int().min(1).max(10).default(5),
  nomeProva: z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
  dataProva: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data da prova inválida.')
    .optional(),
})
export type GerarExerciciosDto = z.infer<typeof gerarExerciciosDto>
