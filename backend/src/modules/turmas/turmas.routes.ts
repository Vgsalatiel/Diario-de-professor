import { Router } from 'express'
import * as turmasController from './turmas.controller'

export const turmasRouter = Router()

turmasRouter.get('/', turmasController.listar)
turmasRouter.post('/', turmasController.criar)
turmasRouter.patch('/:turmaId', turmasController.atualizar)
turmasRouter.delete('/:turmaId', turmasController.remover)

turmasRouter.post('/:turmaId/promover', turmasController.promover)

turmasRouter.get('/:turmaId/config', turmasController.buscarConfig)
turmasRouter.patch('/:turmaId/config', turmasController.atualizarConfig)
