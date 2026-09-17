import { Router } from 'express'
import { autenticar } from '../../middleware/auth'
import { limitadorEsqueciSenha, limitadorLogin, limitadorRegistro } from '../../middleware/rateLimit'
import * as authController from './auth.controller'

export const authRouter = Router()

authRouter.post('/registro', limitadorRegistro, authController.registrar)
authRouter.post('/login', limitadorLogin, authController.entrar)
authRouter.post('/esqueci-senha', limitadorEsqueciSenha, authController.esqueciSenha)
authRouter.post('/redefinir-senha', limitadorLogin, authController.redefinirSenha)
authRouter.post('/verificar-email', limitadorLogin, authController.verificarEmail)
authRouter.post(
  '/reenviar-verificacao',
  autenticar,
  limitadorEsqueciSenha,
  authController.reenviarVerificacao,
)
authRouter.get('/perfil', autenticar, authController.perfil)
authRouter.patch('/perfil', autenticar, authController.atualizarPerfil)
