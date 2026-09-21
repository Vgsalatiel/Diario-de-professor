import { Router } from 'express'
import * as bnccController from './bncc.controller'

// Montado em /bncc — só leitura, a base é fixa (embarcada no backend).
export const bnccRouter = Router()
bnccRouter.get('/habilidades', bnccController.listarHabilidades)
