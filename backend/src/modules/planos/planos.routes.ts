import { Router } from 'express'
import * as planosController from './planos.controller'

// Montado em /planos-de-aula
export const planosRouter = Router()
planosRouter.get('/', planosController.listarTodos)
planosRouter.patch('/:planoId', planosController.atualizar)
planosRouter.delete('/:planoId', planosController.remover)

// Montado em /turmas/:turmaId/planos-de-aula — só a criação, que precisa da turma
export const turmaPlanosRouter = Router({ mergeParams: true })
turmaPlanosRouter.post('/', planosController.criar)
