import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { CadastroProfessor } from './pages/CadastroProfessor'
import { Dashboard } from './pages/Dashboard'
import { Turmas } from './pages/Turmas'
import { Alunos } from './pages/Alunos'
import { Notas } from './pages/Notas'
import { Frequencia } from './pages/Frequencia'
import { PlanoDeAulaPage } from './pages/PlanoDeAula'
import { Agenda } from './pages/Agenda'
import { Assistente } from './pages/Assistente'
import { Perfil } from './pages/Perfil'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <DataProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
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
                  <Route path="/plano-de-aula" element={<PlanoDeAulaPage />} />
                  <Route path="/agenda" element={<Agenda />} />
                  <Route path="/assistente" element={<Assistente />} />
                  <Route path="/perfil" element={<Perfil />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </DataProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
