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
import { Turmas } from './pages/Turmas'
import { Alunos } from './pages/Alunos'
import { Notas } from './pages/Notas'
import { Frequencia } from './pages/Frequencia'
import { Historico } from './pages/Historico'
import { PlanoDeAulaPage } from './pages/PlanoDeAula'
import { Agenda } from './pages/Agenda'
import { Assistente } from './pages/Assistente'
import { Perfil } from './pages/Perfil'
import { Admin } from './pages/Admin'

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
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute somenteAdmin>
                          <Admin />
                        </ProtectedRoute>
                      }
                    />
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
