import { Router } from 'express'
import { limitadorIA } from '../../middleware/rateLimit'
import * as alunosController from './alunos.controller'

// Montado em /alunos
export const alunosRouter = Router()
alunosRouter.get('/', alunosController.listarTodos)
alunosRouter.patch('/:alunoId', alunosController.atualizar)
alunosRouter.delete('/:alunoId', alunosController.remover)
alunosRouter.post('/:alunoId/exercicios-personalizados', limitadorIA, alunosController.gerarExercicios)

// Montado em /turmas/:turmaId/alunos — só a criação, que precisa da turma
export const turmaAlunosRouter = Router({ mergeParams: true })
turmaAlunosRouter.post('/', alunosController.criar)
