import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import MainLayout from './layouts/MainLayout'
import BackupsPage from './pages/BackupsPage'
import DashboardPage from './pages/DashboardPage'
import DatabasesPage from './pages/DatabasesPage'
import DNSPage from './pages/DNSPage'
import EmailPage from './pages/EmailPage'
import FTPPage from './pages/FTPPage'
import LoginPage from './pages/LoginPage'
import MonitoringPage from './pages/MonitoringPage'
import SitesPage from './pages/SitesPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/sites" element={<SitesPage />} />
              <Route path="/databases" element={<DatabasesPage />} />
              <Route path="/email" element={<EmailPage />} />
              <Route path="/dns" element={<DNSPage />} />
              <Route path="/ftp" element={<FTPPage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute roles={['admin', 'reseller']} />}>
            <Route element={<MainLayout />}>
              <Route path="/backups" element={<BackupsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
