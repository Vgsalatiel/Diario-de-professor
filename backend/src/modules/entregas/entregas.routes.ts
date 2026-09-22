import { Router } from 'express'
import * as entregasController from './entregas.controller'

// Montado em /entregas
export const entregasRouter = Router()
entregasRouter.get('/', entregasController.listarEntregas)

// Montado em /alunos/:alunoId/entregas
export const alunoEntregasRouter = Router({ mergeParams: true })
alunoEntregasRouter.put('/:eventoId', entregasController.definirEntrega)
