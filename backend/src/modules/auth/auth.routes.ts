import { Router } from 'express'
import { autenticar } from '../../middleware/auth'
import * as authController from './auth.controller'

export const authRouter = Router()

authRouter.post('/registro', authController.registrar)
authRouter.post('/login', authController.entrar)
authRouter.get('/perfil', autenticar, authController.perfil)
authRouter.patch('/perfil', autenticar, authController.atualizarPerfil)
