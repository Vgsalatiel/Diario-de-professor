import { Router } from 'express'
import { autenticar } from '../../middleware/auth'
import {
  limitadorEsqueciSenha,
  limitadorLoginPorConta,
  limitadorLoginPorRede,
  limitadorRegistro,
  limitadorTokens,
} from '../../middleware/rateLimit'
import * as authController from './auth.controller'

export const authRouter = Router()

authRouter.post('/registro', limitadorRegistro, authController.registrar)
authRouter.post('/login', limitadorLoginPorRede, limitadorLoginPorConta, authController.entrar)
authRouter.post('/esqueci-senha', limitadorEsqueciSenha, authController.esqueciSenha)
authRouter.post('/redefinir-senha', limitadorTokens, authController.redefinirSenha)
authRouter.post('/verificar-email', limitadorTokens, authController.verificarEmail)
authRouter.post(
  '/reenviar-verificacao',
  autenticar,
  limitadorEsqueciSenha,
  authController.reenviarVerificacao,
)
authRouter.get('/perfil', autenticar, authController.perfil)
authRouter.patch('/perfil', autenticar, authController.atualizarPerfil)
