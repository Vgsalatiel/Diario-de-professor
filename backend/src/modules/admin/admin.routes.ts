import { Router } from 'express'
import { exigirAdmin } from '../../middleware/exigirAdmin'
import * as adminController from './admin.controller'

export const adminRouter = Router()

adminRouter.use(exigirAdmin)
adminRouter.get('/dashboard', adminController.obterDashboard)
adminRouter.get('/professores', adminController.listarProfessores)
adminRouter.delete('/professores/:professorId', adminController.excluirProfessor)
