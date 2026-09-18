import { Router } from 'express'
import * as feriadosController from './feriados.controller'

export const feriadosRouter = Router()

feriadosRouter.get('/', feriadosController.listarFeriados)
feriadosRouter.post('/', feriadosController.criarFeriado)
feriadosRouter.delete('/:feriadoId', feriadosController.removerFeriado)
