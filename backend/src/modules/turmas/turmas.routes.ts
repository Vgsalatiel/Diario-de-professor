import { Router } from 'express'
import * as turmasController from './turmas.controller'

// Somente leitura — ver turmas.controller.ts.
export const turmasRouter = Router()

turmasRouter.get('/', turmasController.listar)

turmasRouter.get('/:turmaId/config', turmasController.buscarConfig)
turmasRouter.patch('/:turmaId/config', turmasController.atualizarConfig)
