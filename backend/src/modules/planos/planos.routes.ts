import { Router } from 'express'
import * as planosController from './planos.controller'
import { limitadorPlanoIA } from '../../middleware/rateLimit'

// Montado em /planos-de-aula
export const planosRouter = Router()
planosRouter.get('/', planosController.listarTodos)
planosRouter.patch('/:planoId', planosController.atualizar)
planosRouter.delete('/:planoId', planosController.remover)

// Montado em /turmas/:turmaId/planos-de-aula — a criação e o assistente de
// IA, que precisam da turma pra saber disciplina/etapa/ano.
export const turmaPlanosRouter = Router({ mergeParams: true })
turmaPlanosRouter.post('/', planosController.criar)
turmaPlanosRouter.post('/gerar-ia', limitadorPlanoIA, planosController.gerarComIA)
