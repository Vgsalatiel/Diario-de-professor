import { z } from 'zod'

export const tipoObservacaoEnum = z.enum(['comentario', 'solicitacaoCorrecao'])

export const criarObservacaoDto = z.object({
  professorAlvoId: z.string().min(1),
  turmaId: z.string().min(1).optional(),
  texto: z.string().trim().min(1).max(2000),
  tipo: tipoObservacaoEnum.default('comentario'),
})
export type CriarObservacaoDto = z.infer<typeof criarObservacaoDto>

export const criarReuniaoDto = z.object({
  titulo: z.string().trim().min(1).max(200),
  data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  hora: z.string().trim().optional(),
  turmaId: z.string().min(1).optional(),
  conteudo: z.string().trim().max(2000).optional(),
  participantes: z.array(z.string().trim().min(1)).max(30).default([]),
  pauta: z.array(z.string().trim().min(1)).max(30).default([]),
})
export type CriarReuniaoDto = z.infer<typeof criarReuniaoDto>

// Atualiza a reunião depois de marcada — pauta, participantes e a ata
// (registro do que foi discutido). Não dá pra mudar data/hora/turma por
// aqui: isso é edição de agenda, não da reunião em si.
export const atualizarReuniaoDto = z.object({
  pauta: z.array(z.string().trim().min(1)).max(30).optional(),
  participantes: z.array(z.string().trim().min(1)).max(30).optional(),
  ata: z.string().trim().max(5000).nullable().optional(),
})
export type AtualizarReuniaoDto = z.infer<typeof atualizarReuniaoDto>

export const criarEncaminhamentoDto = z.object({
  texto: z.string().trim().min(1).max(500),
  responsavelId: z.string().min(1).nullable().optional(),
})
export type CriarEncaminhamentoDto = z.infer<typeof criarEncaminhamentoDto>
