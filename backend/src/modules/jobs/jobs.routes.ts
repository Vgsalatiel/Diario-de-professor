import { Router } from 'express'
import { verificarSegredoJob } from '../../middleware/segredoJob'
import * as jobsController from './jobs.controller'

export const jobsRouter = Router()

jobsRouter.post('/avisos-diarios', verificarSegredoJob, jobsController.avisosDiarios)
