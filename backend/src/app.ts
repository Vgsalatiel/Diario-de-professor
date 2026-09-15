import cors from 'cors'
import express from 'express'
import { autenticar } from './middleware/auth'
import { errorHandler, rotaNaoEncontrada } from './middleware/errorHandler'
import { authRouter } from './modules/auth/auth.routes'
import { alunosRouter, turmaAlunosRouter } from './modules/alunos/alunos.routes'
import { avaliacoesRouter, turmaAvaliacoesRouter } from './modules/avaliacoes/avaliacoes.routes'
import { eventosRouter } from './modules/eventos/eventos.routes'
import {
  alunoFrequenciaRouter,
  datasAulaRouter,
  frequenciaRouter,
  turmaDatasAulaRouter,
} from './modules/frequencia/frequencia.routes'
import { alunoNotasRouter, notasRouter } from './modules/notas/notas.routes'
import { turmasRouter } from './modules/turmas/turmas.routes'
import { planosRouter, turmaPlanosRouter } from './modules/planos/planos.routes'
import {
  registrosAulaRouter,
  turmaRegistrosAulaRouter,
} from './modules/registrosAula/registrosAula.routes'

export const app = express()

app.use(cors())
app.use(express.json())

app.get('/saude', (_req, res) => res.json({ ok: true }))

// Público: cadastro e login. As demais rotas de /auth exigem token.
app.use('/auth', authRouter)

// Rotas aninhadas (mais específicas) primeiro, senão o Express cai na
// rota genérica de /turmas ou /alunos antes de chegar nelas.
app.use('/turmas/:turmaId/alunos', autenticar, turmaAlunosRouter)
app.use('/turmas/:turmaId/avaliacoes', autenticar, turmaAvaliacoesRouter)
app.use('/turmas/:turmaId/datas-aula', autenticar, turmaDatasAulaRouter)
app.use('/turmas/:turmaId/planos-de-aula', autenticar, turmaPlanosRouter)
app.use('/turmas/:turmaId/registros-aula', autenticar, turmaRegistrosAulaRouter)
app.use('/turmas', autenticar, turmasRouter)

app.use('/alunos/:alunoId/notas', autenticar, alunoNotasRouter)
app.use('/alunos/:alunoId/frequencia', autenticar, alunoFrequenciaRouter)
app.use('/alunos', autenticar, alunosRouter)

app.use('/avaliacoes', autenticar, avaliacoesRouter)
app.use('/notas', autenticar, notasRouter)
app.use('/eventos', autenticar, eventosRouter)
app.use('/datas-aula', autenticar, datasAulaRouter)
app.use('/frequencia', autenticar, frequenciaRouter)
app.use('/planos-de-aula', autenticar, planosRouter)
app.use('/registros-aula', autenticar, registrosAulaRouter)

app.use(rotaNaoEncontrada)
app.use(errorHandler)
