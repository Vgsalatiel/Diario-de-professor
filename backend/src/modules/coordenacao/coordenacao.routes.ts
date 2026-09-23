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
coordenacaoRouter.get('/alunos/:id', coordenacaoController.detalharAluno)
coordenacaoRouter.post('/alunos/:id/acompanhamento', coordenacaoController.criarAcompanhamento)
coordenacaoRouter.get('/eventos', coordenacaoController.listarEventos)
coordenacaoRouter.post('/reunioes', coordenacaoController.criarReuniao)
coordenacaoRouter.get('/reunioes/:id', coordenacaoController.detalharReuniao)
coordenacaoRouter.patch('/reunioes/:id', coordenacaoController.atualizarReuniao)
coordenacaoRouter.post('/reunioes/:id/encaminhamentos', coordenacaoController.criarEncaminhamento)
coordenacaoRouter.patch(
  '/encaminhamentos/:id/alternar',
  coordenacaoController.alternarEncaminhamento,
)
coordenacaoRouter.delete('/encaminhamentos/:id', coordenacaoController.removerEncaminhamento)
coordenacaoRouter.get('/observacoes', coordenacaoController.listarObservacoes)
coordenacaoRouter.post('/observacoes', coordenacaoController.criarObservacao)
coordenacaoRouter.delete('/observacoes/:id', coordenacaoController.removerObservacao)

// Montado em /observacoes-recebidas, só atrás de "autenticar" — qualquer
// professor lê as observações endereçadas a ele mesmo.
export const minhasObservacoesRouter = Router()
minhasObservacoesRouter.get('/', coordenacaoController.minhasObservacoes)
minhasObservacoesRouter.patch('/:id/resolver', coordenacaoController.resolverObservacao)
