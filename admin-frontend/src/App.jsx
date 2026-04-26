import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './store/AdminAuthContext';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage              from './pages/LoginPage';
import DashboardPage          from './pages/DashboardPage';
import ClinicsPage            from './pages/ClinicsPage';
import ClinicDetailPage       from './pages/ClinicDetailPage';
import PlansPage              from './pages/PlansPage';
import SubscriptionsPage      from './pages/SubscriptionsPage';
import PlatformSettingsPage   from './pages/PlatformSettingsPage';
import SystemHealthPage       from './pages/SystemHealthPage';
import SystemLogsPage         from './pages/SystemLogsPage';
import EnquiriesPage          from './pages/EnquiriesPage';

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
      <Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
      <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionsPage /></ProtectedRoute>} />
      <Route path="/platform-settings" element={<ProtectedRoute><PlatformSettingsPage /></ProtectedRoute>} />
      <Route path="/system-health"     element={<ProtectedRoute><SystemHealthPage /></ProtectedRoute>} />
      <Route path="/system-logs"       element={<ProtectedRoute><SystemLogsPage /></ProtectedRoute>} />
      <Route path="/enquiries"         element={<ProtectedRoute><EnquiriesPage /></ProtectedRoute>} />
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
