import { Router } from 'express'
import * as registrosAulaController from './registrosAula.controller'

// Montado em /registros-aula
export const registrosAulaRouter = Router()
registrosAulaRouter.get('/', registrosAulaController.listarTodos)

// Montado em /turmas/:turmaId/registros-aula — cria ou atualiza o
// registro daquela turma+data (upsert)
export const turmaRegistrosAulaRouter = Router({ mergeParams: true })
turmaRegistrosAulaRouter.put('/', registrosAulaController.definir)
