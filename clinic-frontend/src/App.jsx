import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import LoginPage       from './pages/auth/LoginPage';
import DashboardRouter from './pages/dashboard/DashboardRouter';

// Phase 2.1 — Patients
import PatientList    from './pages/patients/PatientList';
import PatientProfile from './pages/patients/PatientProfile';

// Phase 2.2 — Appointments
import AppointmentsPage from './pages/appointments/AppointmentsPage';

// Phase 2.3 — Consultations
import ConsultationsPage from './pages/consultations/ConsultationsPage';

// Phase 2.4 — Prescriptions & Medicines
import PrescriptionsPage  from './pages/prescriptions/PrescriptionsPage';
import MedicineStorePage  from './pages/medicines/MedicineStorePage';

// Phase 2.5
// import InvoiceForm         from './pages/billing/InvoiceForm';
// import EndOfDay            from './pages/billing/EndOfDay';

// Phase 2.6
// import AdminReports        from './pages/reports/AdminReports';

// Phase 2.7
// import ClinicSettings      from './pages/settings/ClinicSettings';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected — all authenticated roles */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />

      {/* Phase 2.1 — Patients */}
      <Route path="/patients"     element={<ProtectedRoute><PatientList /></ProtectedRoute>} />
      <Route path="/patients/:id" element={<ProtectedRoute><PatientProfile /></ProtectedRoute>} />

      {/* Phase 2.2 — Appointments */}
      <Route path="/appointments" element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />

      {/* Phase 2.3 — Consultations */}
      <Route path="/consultations" element={
        <ProtectedRoute allowedRoles={['doctor', 'admin']}>
          <ConsultationsPage />
        </ProtectedRoute>
      } />

      {/* Phase 2.4 — Prescriptions */}
      <Route path="/prescriptions" element={
        <ProtectedRoute allowedRoles={['doctor', 'nurse', 'receptionist', 'admin']}>
          <PrescriptionsPage />
        </ProtectedRoute>
      } />

      {/* Phase 2.4 — Medicine Store (admin only) */}
      <Route path="/medicines" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <MedicineStorePage />
        </ProtectedRoute>
      } />

      {/* Phase 2.5 — Billing */}
      {/* <Route path="/billing"               element={<ProtectedRoute allowedRoles={['receptionist','admin']}><InvoiceForm /></ProtectedRoute>} /> */}
      {/* <Route path="/billing/end-of-day"    element={<ProtectedRoute allowedRoles={['receptionist','admin']}><EndOfDay /></ProtectedRoute>} /> */}

      {/* Phase 2.6 — Reports */}
      {/* <Route path="/reports"               element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} /> */}

      {/* Phase 2.7 — Settings */}
      {/* <Route path="/settings"              element={<ProtectedRoute allowedRoles={['admin']}><ClinicSettings /></ProtectedRoute>} /> */}

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
