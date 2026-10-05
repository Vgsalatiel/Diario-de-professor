import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'
import { AnoLetivoProvider } from './context/AnoLetivoContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { EsqueciSenha } from './pages/EsqueciSenha'
import { RedefinirSenha } from './pages/RedefinirSenha'
import { VerificarEmail } from './pages/VerificarEmail'
import { CadastroProfessor } from './pages/CadastroProfessor'
import { Dashboard } from './pages/Dashboard'
import { lazyNomeado } from './lib/lazy'

// Login, cadastro, menu e Início vêm junto com o app; as demais telas são
// baixadas na primeira vez que o professor abre cada uma (o Layout mostra
// "Carregando…" nesse instante).
const Turmas = lazyNomeado(() => import('./pages/Turmas'), 'Turmas')
const Alunos = lazyNomeado(() => import('./pages/Alunos'), 'Alunos')
const Notas = lazyNomeado(() => import('./pages/Notas'), 'Notas')
const Frequencia = lazyNomeado(() => import('./pages/Frequencia'), 'Frequencia')
const Historico = lazyNomeado(() => import('./pages/Historico'), 'Historico')
const PlanoDeAulaPage = lazyNomeado(() => import('./pages/PlanoDeAula'), 'PlanoDeAulaPage')
const Agenda = lazyNomeado(() => import('./pages/Agenda'), 'Agenda')
const Assistente = lazyNomeado(() => import('./pages/Assistente'), 'Assistente')
const Perfil = lazyNomeado(() => import('./pages/Perfil'), 'Perfil')

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <DataProvider>
            <AnoLetivoProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/esqueci-senha" element={<EsqueciSenha />} />
                  <Route path="/redefinir-senha" element={<RedefinirSenha />} />
                  <Route path="/verificar-email" element={<VerificarEmail />} />
                  <Route path="/cadastro" element={<CadastroProfessor />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/turmas" element={<Turmas />} />
                    <Route path="/alunos" element={<Alunos />} />
                    <Route path="/notas" element={<Notas />} />
                    <Route path="/frequencia" element={<Frequencia />} />
                    <Route path="/historico" element={<Historico />} />
                    <Route path="/plano-de-aula" element={<PlanoDeAulaPage />} />
                    <Route path="/agenda" element={<Agenda />} />
                    <Route path="/assistente" element={<Assistente />} />
                    <Route path="/perfil" element={<Perfil />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </AnoLetivoProvider>
          </DataProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
