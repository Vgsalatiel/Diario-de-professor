import type { Request, Response } from 'express'
import * as bncc from '../../lib/bncc'

export function listarHabilidades(req: Request, res: Response) {
  const etapa = typeof req.query.etapa === 'string' ? req.query.etapa : undefined
  const componente = typeof req.query.componente === 'string' ? req.query.componente : undefined
  const ano = typeof req.query.ano === 'string' ? Number(req.query.ano) : undefined

  res.json(bncc.listarHabilidades({ etapa, componente, ano: Number.isFinite(ano) ? ano : undefined }))
}

// Nomes oficiais dos componentes curriculares pra etapa — usado pra
// preencher o campo "Disciplina" da turma com opções que batem exatamente
// com a base da BNCC (texto livre não bate por causa de acento/maiúscula/
// nome diferente, e foi isso que deixou o seletor de habilidades vazio).
export function listarComponentes(req: Request, res: Response) {
  const etapa = typeof req.query.etapa === 'string' ? req.query.etapa : undefined
  res.json(bncc.listarComponentes(etapa))
}
