import { Router } from 'express'
import * as eventosController from './eventos.controller'

export const eventosRouter = Router()
eventosRouter.get('/', eventosController.listarTodos)
eventosRouter.post('/', eventosController.criar)
eventosRouter.patch('/:eventoId', eventosController.atualizar)
eventosRouter.delete('/:eventoId', eventosController.remover)
