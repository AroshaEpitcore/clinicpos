import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import LoginPage        from './pages/auth/LoginPage';
import ImpersonatePage  from './pages/auth/ImpersonatePage';
import DashboardRouter  from './pages/dashboard/DashboardRouter';

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

// Phase 2.5 — Billing
import BillingPage  from './pages/billing/BillingPage';
import EndOfDayPage from './pages/billing/EndOfDayPage';

// Phase 2.6 — Reports
import ReportsPage from './pages/reports/ReportsPage';

// Phase 2.7 — Settings
import SettingsPage      from './pages/settings/SettingsPage';

// Subscription info (admin only)
import SubscriptionPage  from './pages/subscription/SubscriptionPage';

// Phase 5.1 — Pharmacy
import PharmacyPage from './pages/pharmacy/PharmacyPage';

// Phase 5.2 — Lab
import LabPage from './pages/lab/LabPage';

// Phase 5.3 — Insurance
import InsurancePage from './pages/insurance/InsurancePage';

// Phase 5.4 — Patient Portal / Online Booking (public)
import BookingPage from './pages/booking/BookingPage';

// Phase 5.5 — Queue Display (public waiting-room TV screen)
import DisplayPage from './pages/display/DisplayPage';

// Staff Management (admin only)
import StaffPage from './pages/staff/StaffPage';

// Help & User Guide (all roles)
import HelpPage from './pages/help/HelpPage';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"       element={<LoginPage />} />
      <Route path="/impersonate" element={<ImpersonatePage />} />
      <Route path="/book"        element={<BookingPage />} />
      <Route path="/display"     element={<DisplayPage />} />

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
      <Route path="/billing" element={
        <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
          <BillingPage />
        </ProtectedRoute>
      } />
      <Route path="/billing/end-of-day" element={
        <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
          <EndOfDayPage />
        </ProtectedRoute>
      } />

      {/* Phase 2.6 — Reports */}
      <Route path="/reports" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ReportsPage />
        </ProtectedRoute>
      } />

      {/* Staff Management */}
      <Route path="/staff" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <StaffPage />
        </ProtectedRoute>
      } />

      {/* Phase 2.7 — Settings */}
      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <SettingsPage />
        </ProtectedRoute>
      } />

      {/* Subscription */}
      <Route path="/subscription" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <SubscriptionPage />
        </ProtectedRoute>
      } />

      {/* Phase 5.1 — Pharmacy */}
      <Route path="/pharmacy" element={
        <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
          <PharmacyPage />
        </ProtectedRoute>
      } />

      {/* Phase 5.2 — Lab */}
      <Route path="/lab" element={
        <ProtectedRoute allowedRoles={['doctor', 'nurse', 'admin', 'receptionist']}>
          <LabPage />
        </ProtectedRoute>
      } />

      {/* Phase 5.3 — Insurance */}
      <Route path="/insurance" element={
        <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
          <InsurancePage />
        </ProtectedRoute>
      } />

      {/* Help & User Guide — all roles */}
      <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
