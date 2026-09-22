import { Router } from 'express'
import * as coordenacaoController from './coordenacao.controller'

// Montado em /coordenacao, atrás de exigirCoordenacao.
export const coordenacaoRouter = Router()
coordenacaoRouter.get('/dashboard', coordenacaoController.dashboard)
coordenacaoRouter.get('/professores', coordenacaoController.listarProfessores)
coordenacaoRouter.get('/professores/:id', coordenacaoController.detalharProfessor)
coordenacaoRouter.get('/turmas', coordenacaoController.listarTurmas)
coordenacaoRouter.get('/turmas/:id', coordenacaoController.detalharTurma)
coordenacaoRouter.get('/alunos', coordenacaoController.listarAlunos)
coordenacaoRouter.get('/eventos', coordenacaoController.listarEventos)
coordenacaoRouter.post('/reunioes', coordenacaoController.criarReuniao)
coordenacaoRouter.get('/observacoes', coordenacaoController.listarObservacoes)
coordenacaoRouter.post('/observacoes', coordenacaoController.criarObservacao)
coordenacaoRouter.delete('/observacoes/:id', coordenacaoController.removerObservacao)

// Montado em /observacoes-recebidas, só atrás de "autenticar" — qualquer
// professor lê as observações endereçadas a ele mesmo.
export const minhasObservacoesRouter = Router()
minhasObservacoesRouter.get('/', coordenacaoController.minhasObservacoes)
