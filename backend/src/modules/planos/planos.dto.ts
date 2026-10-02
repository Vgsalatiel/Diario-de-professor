import { z } from 'zod'
import { dataISO } from '../../utils/validators'
import { limparHtml } from '../../lib/html'

export const duracaoPlanoEnum = z.enum(['quinzenal', 'semestral', 'personalizado'])

// Um item do cronograma gerado pelo Assistente de planejamento
// contextual — uma aula planejada dentro do período do plano.
export const cronogramaItemDto = z.object({
  numero: z.number().int().min(1),
  data: dataISO('Data inválida.'),
  habilidadeCodigo: z.string().trim().min(1),
  habilidadeTexto: z.string().trim().min(1),
  subtema: z.string().trim().min(1),
  resumo: z.string().trim().min(1),
})
export type CronogramaItemDto = z.infer<typeof cronogramaItemDto>

export const criarPlanoDto = z.object({
  titulo: z.string().trim().min(1, 'Informe o título do plano.'),
  duracao: duracaoPlanoEnum,
  dataInicio: dataISO('Data de início inválida.'),
  dataFim: dataISO('Data de término inválida.'),
  conteudo: z.string().trim().transform(limparHtml).optional(),
  // Preenchido quando o conteúdo veio do Assistente de planejamento
  // contextual — cada habilidadeCodigo é revalidado no backend antes de
  // salvar (ver planos.service.ts), nunca aceito só porque veio do cliente.
  cronograma: z.array(cronogramaItemDto).optional(),
})
export type CriarPlanoDto = z.infer<typeof criarPlanoDto>

export const atualizarPlanoDto = criarPlanoDto.partial()
export type AtualizarPlanoDto = z.infer<typeof atualizarPlanoDto>

export const gerarPlanoIaDto = z.object({
  temaGeral: z.string().trim().min(1, 'Informe o tema geral do período.').max(300, 'Máximo de 300 caracteres.'),
  dataInicio: dataISO('Data de início inválida.'),
  dataFim: dataISO('Data de término inválida.'),
})
export type GerarPlanoIaDto = z.infer<typeof gerarPlanoIaDto>
