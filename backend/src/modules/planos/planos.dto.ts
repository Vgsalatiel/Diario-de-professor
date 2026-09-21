import { z } from 'zod'

export const duracaoPlanoEnum = z.enum(['quinzenal', 'semestral', 'personalizado'])

export const criarPlanoDto = z.object({
  titulo: z.string().trim().min(1, 'Informe o título do plano.'),
  duracao: duracaoPlanoEnum,
  dataInicio: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início inválida.'),
  dataFim: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de término inválida.'),
  conteudo: z.string().trim().optional(),
  // Preenchidos quando o conteúdo veio do Assistente de planejamento
  // contextual — o código é sempre revalidado no backend antes de salvar.
  bnccCodigo: z.string().trim().optional(),
  bnccTexto: z.string().trim().optional(),
})
export type CriarPlanoDto = z.infer<typeof criarPlanoDto>

export const atualizarPlanoDto = criarPlanoDto.partial()
export type AtualizarPlanoDto = z.infer<typeof atualizarPlanoDto>

export const gerarPlanoIaDto = z.object({
  tema: z.string().trim().min(1, 'Informe o tema da aula.'),
  duracaoMinutos: z.number().int().min(5).max(240),
  habilidadeCodigo: z.string().trim().min(1, 'Selecione uma habilidade da BNCC.'),
})
export type GerarPlanoIaDto = z.infer<typeof gerarPlanoIaDto>
