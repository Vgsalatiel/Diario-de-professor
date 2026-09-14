import { Router } from 'express'
import * as notasController from './notas.controller'

// Montado em /notas
export const notasRouter = Router()
notasRouter.get('/', notasController.listarTodas)

// Montado em /alunos/:alunoId/notas
export const alunoNotasRouter = Router({ mergeParams: true })
alunoNotasRouter.put('/:avaliacaoId', notasController.definir)
