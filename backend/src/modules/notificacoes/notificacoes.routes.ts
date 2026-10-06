import { Router } from 'express'
import * as notificacoesController from './notificacoes.controller'

export const notificacoesRouter = Router()

notificacoesRouter.get('/chave-publica', notificacoesController.chavePublica)
notificacoesRouter.post('/inscricoes', notificacoesController.inscrever)
// POST em vez de DELETE porque o endpoint (uma URL longa) vai no corpo
notificacoesRouter.post('/inscricoes/remover', notificacoesController.removerInscricao)
