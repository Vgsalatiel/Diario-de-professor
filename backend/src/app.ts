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
import { jobsRouter } from './modules/jobs/jobs.routes'
import { adminRouter } from './modules/admin/admin.routes'
import { feriadosRouter } from './modules/feriados/feriados.routes'
import { bnccRouter } from './modules/bncc/bncc.routes'

export const app = express()

// O Render coloca a API atrás de um proxy reverso — sem isso, o
// express-rate-limit (e qualquer coisa que dependa do IP do cliente) enxerga
// o IP do proxy pra todo mundo, em vez do IP de quem fez a requisição.
app.set('trust proxy', 1)

// Em produção, restringe quem pode chamar a API — evita que qualquer site
// use um token roubado pra bater na API a partir do navegador de outra pessoa.
// Em dev, sem FRONTEND_URL definida, libera geral pra não travar localhost.
const origensPermitidas = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
  : true

app.use(cors({ origin: origensPermitidas }))
app.use(express.json())

app.get('/saude', (_req, res) => res.json({ ok: true }))

// Público: cadastro e login. As demais rotas de /auth exigem token.
app.use('/auth', authRouter)

// Chamado só pela automação diária (GitHub Actions) — protegido por senha
// compartilhada em vez de JWT, já que não tem um professor logado por trás.
app.use('/jobs', jobsRouter)

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
app.use('/feriados', autenticar, feriadosRouter)
app.use('/bncc', autenticar, bnccRouter)

// Painel de diretor(a) — exigirAdmin confere isAdmin depois de autenticar.
app.use('/admin', autenticar, adminRouter)

app.use(rotaNaoEncontrada)
app.use(errorHandler)
