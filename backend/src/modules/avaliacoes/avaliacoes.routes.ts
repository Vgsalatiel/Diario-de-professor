import { Router } from 'express'
import * as avaliacoesController from './avaliacoes.controller'

// Montado em /avaliacoes
export const avaliacoesRouter = Router()
avaliacoesRouter.get('/', avaliacoesController.listarTodas)
avaliacoesRouter.patch('/:avaliacaoId', avaliacoesController.atualizar)
avaliacoesRouter.delete('/:avaliacaoId', avaliacoesController.remover)

// Montado em /turmas/:turmaId/avaliacoes — só a criação
export const turmaAvaliacoesRouter = Router({ mergeParams: true })
turmaAvaliacoesRouter.post('/', avaliacoesController.criar)
