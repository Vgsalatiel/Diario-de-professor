import { Router } from 'express'
import * as frequenciaController from './frequencia.controller'

// Montado em /datas-aula
export const datasAulaRouter = Router()
datasAulaRouter.get('/', frequenciaController.listarDatasAula)

// Montado em /frequencia
export const frequenciaRouter = Router()
frequenciaRouter.get('/', frequenciaController.listarFrequencia)

// Montado em /turmas/:turmaId/datas-aula
export const turmaDatasAulaRouter = Router({ mergeParams: true })
turmaDatasAulaRouter.post('/', frequenciaController.garantirDataAula)
turmaDatasAulaRouter.post('/alternar-sem-aula', frequenciaController.alternarSemAula)

// Montado em /alunos/:alunoId/frequencia
export const alunoFrequenciaRouter = Router({ mergeParams: true })
alunoFrequenciaRouter.put('/:dataAulaId', frequenciaController.definirPresenca)
