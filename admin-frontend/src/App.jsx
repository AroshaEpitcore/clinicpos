import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './store/AdminAuthContext';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage        from './pages/LoginPage';
import DashboardPage    from './pages/DashboardPage';
import ClinicsPage      from './pages/ClinicsPage';
import ClinicDetailPage from './pages/ClinicDetailPage';

function ProtectedRoute({ children }) {
  const { admin } = useAdminAuth();
  if (!admin) return <Navigate to="/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

function AppRoutes() {
  const { admin } = useAdminAuth();
  return (
    <Routes>
      <Route path="/login" element={admin ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/clinics" element={<ProtectedRoute><ClinicsPage /></ProtectedRoute>} />
      <Route path="/clinics/:id" element={<ProtectedRoute><ClinicDetailPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <AppRoutes />
    </AdminAuthProvider>
  );
}
